import 'dart:io';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

class AspirinCipherEngine {
  static const int headerSize = 36; // 4 bytes magic ('ASPR') + 16 bytes IV + 16 bytes tag
  static const String magicHeader = 'ASPR';

  final Uint8List masterKey; // 256-bit AES Master Encryption Key

  AspirinCipherEngine({required this.masterKey});

  /// Decrypts an arbitrary byte range from an encrypted file on disk (O(1) random seeking)
  Future<Uint8List> decryptByteRange({
    required File encryptedFile,
    required int rangeStart,
    required int rangeLength,
  }) async {
    final raf = await encryptedFile.open(mode: FileMode.read);
    try {
      // 1. Read IV/Nonce from file header (bytes 4..20)
      await raf.setPosition(4);
      final iv = await raf.read(16);

      // 2. Calculate AES-CTR counter block offset
      final int startBlock = rangeStart ~/ 16;
      final int blockOffset = rangeStart % 16;
      final int totalBytesToRead = blockOffset + rangeLength;

      // 3. Read encrypted slice from disk
      await raf.setPosition(headerSize + (startBlock * 16));
      final encryptedBytes = await raf.read(totalBytesToRead);

      // 4. Initialize CTR cipher at the calculated block offset
      final effectiveIv = _incrementCounter(iv, startBlock);
      final cipher = CTRStreamCipher(AESEngine())
        ..init(false, ParametersWithIV(KeyParameter(masterKey), effectiveIv));

      final decryptedBytes = Uint8List(encryptedBytes.length);
      cipher.processBytes(encryptedBytes, 0, encryptedBytes.length, decryptedBytes, 0);

      // 5. Slice and return the exact requested byte range
      return decryptedBytes.sublist(blockOffset, blockOffset + rangeLength);
    } finally {
      await raf.close();
    }
  }

  /// Encrypts an incoming stream chunk-by-chunk and writes directly to an encrypted file
  Future<void> encryptFileStream({
    required Stream<List<int>> inputStream,
    required File targetFile,
    required Uint8List randomIv,
  }) async {
    final raf = await targetFile.open(mode: FileMode.write);
    try {
      // 1. Write header: "ASPR" + 16-byte IV + 16-byte integrity tag
      final header = BytesBuilder();
      header.add(magicHeader.codeUnits); // 4 bytes
      header.add(randomIv); // 16 bytes
      header.add(Uint8List(16)); // 16 bytes integrity tag placeholder
      await raf.writeFrom(header.toBytes());

      // 2. Initialize CTR cipher
      final cipher = CTRStreamCipher(AESEngine())
        ..init(true, ParametersWithIV(KeyParameter(masterKey), randomIv));

      // 3. Encrypt stream chunks on-the-fly and write to disk
      await for (final chunk in inputStream) {
        final inputBytes = Uint8List.fromList(chunk);
        final encryptedChunk = Uint8List(inputBytes.length);
        cipher.processBytes(inputBytes, 0, inputBytes.length, encryptedChunk, 0);
        await raf.writeFrom(encryptedChunk);
      }
    } finally {
      await raf.close();
    }
  }

  Uint8List _incrementCounter(Uint8List baseIv, int counterIncrement) {
    final counter = Uint8List.fromList(baseIv);
    int carry = counterIncrement;
    for (int i = 15; i >= 0 && carry > 0; i--) {
      final int sum = counter[i] + (carry & 0xFF);
      counter[i] = sum & 0xFF;
      carry = (carry >> 8) + (sum >> 8);
    }
    return counter;
  }
}

/// Convenience engine subclass exposing chunk decryption by byte offset
class CipherEngine extends AspirinCipherEngine {
  CipherEngine({Uint8List? masterKey})
      : super(masterKey: masterKey ?? Uint8List(32));

  Uint8List decryptBytesAtOffset({
    required Uint8List key,
    required Uint8List iv,
    required int byteOffset,
    required Uint8List ciphertext,
  }) {
    final int startBlock = byteOffset ~/ 16;
    final effectiveIv = _incrementCounter(iv, startBlock);

    final cipher = CTRStreamCipher(AESEngine())
      ..init(false, ParametersWithIV(KeyParameter(key), effectiveIv));

    final decrypted = Uint8List(ciphertext.length);
    cipher.processBytes(ciphertext, 0, ciphertext.length, decrypted, 0);
    return decrypted;
  }
}
