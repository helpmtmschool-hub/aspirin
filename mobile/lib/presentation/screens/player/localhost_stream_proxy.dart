import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import '../../../core/security/cipher_engine.dart';
import '../../../core/security/secure_vault.dart';

/// Localhost HTTP streaming server for zero-disk-dump on-the-fly AES-256-CTR decryption
class LocalhostStreamProxy {
  final CipherEngine cipherEngine;
  final SecureVault secureVault;
  HttpServer? _server;
  int _port = 0;

  LocalhostStreamProxy({
    required this.cipherEngine,
    required this.secureVault,
  });

  int get port => _port;
  bool get isRunning => _server != null;

  /// Starts the local HTTP proxy on loopback 127.0.0.1
  Future<void> start() async {
    if (_server != null) return;

    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _port = _server!.port;

    _server!.listen((HttpRequest request) async {
      try {
        final uri = request.uri;
        final topicId = uri.queryParameters['id'];
        final isNote = uri.queryParameters['isNote'] == 'true';

        if (topicId == null || topicId.isEmpty) {
          request.response.statusCode = HttpStatus.badRequest;
          await request.response.close();
          return;
        }

        final encryptedFile = await secureVault.getEncryptedFile(topicId, isNote: isNote);
        if (!encryptedFile.existsSync()) {
          request.response.statusCode = HttpStatus.notFound;
          await request.response.close();
          return;
        }

        final masterKey = await secureVault.getMasterKey();
        final fileLength = await encryptedFile.length();
        // File format: 16 bytes IV + encrypted ciphertext
        if (fileLength < 16) {
          request.response.statusCode = HttpStatus.internalServerError;
          await request.response.close();
          return;
        }

        final randomAccess = await encryptedFile.open(mode: FileMode.read);
        // Read 16-byte Nonce/IV
        final iv = await randomAccess.read(16);
        final cipherLength = fileLength - 16;

        // Parse HTTP Range Header for media_kit fast seek
        final rangeHeader = request.headers.value(HttpHeaders.rangeHeader);
        int start = 0;
        int end = cipherLength - 1;

        if (rangeHeader != null && rangeHeader.startsWith('bytes=')) {
          final parts = rangeHeader.substring(6).split('-');
          start = int.tryParse(parts[0]) ?? 0;
          if (parts.length > 1 && parts[1].isNotEmpty) {
            end = int.tryParse(parts[1]) ?? (cipherLength - 1);
          }
        }

        if (start >= cipherLength) {
          request.response.statusCode = HttpStatus.rangeNotSatisfiable;
          request.response.headers.set(HttpHeaders.contentRangeHeader, 'bytes */$cipherLength');
          await request.response.close();
          await randomAccess.close();
          return;
        }

        final contentLength = end - start + 1;
        request.response.statusCode =
            rangeHeader != null ? HttpStatus.partialContent : HttpStatus.ok;

        request.response.headers.set(HttpHeaders.acceptRangesHeader, 'bytes');
        request.response.headers.set(
            HttpHeaders.contentRangeHeader, 'bytes $start-$end/$cipherLength');
        request.response.headers.set(HttpHeaders.contentLengthHeader, contentLength);
        request.response.headers.set(
            HttpHeaders.contentTypeHeader, isNote ? 'application/pdf' : 'video/mp4');

        // Stream decrypted bytes chunk-by-chunk without full disk or RAM allocation
        const chunkSize = 64 * 1024; // 64 KB streaming buffer
        int currentPos = start;

        while (currentPos <= end) {
          final toRead = (currentPos + chunkSize <= end + 1)
              ? chunkSize
              : (end - currentPos + 1);

          await randomAccess.setPosition(16 + currentPos);
          final encryptedChunk = await randomAccess.read(toRead);

          final decryptedChunk = cipherEngine.decryptBytesAtOffset(
            key: masterKey,
            iv: iv,
            byteOffset: currentPos,
            ciphertext: encryptedChunk,
          );

          request.response.add(decryptedChunk);
          currentPos += toRead;
        }

        await request.response.flush();
        await request.response.close();
        await randomAccess.close();
      } catch (e) {
        try {
          request.response.statusCode = HttpStatus.internalServerError;
          await request.response.close();
        } catch (_) {}
      }
    });
  }

  /// Gets the local streaming URL for the encrypted media
  String getLocalStreamingUrl(String topicId, {bool isNote = false}) {
    return 'http://127.0.0.1:$_port/stream?id=$topicId&isNote=$isNote';
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
    _port = 0;
  }
}
