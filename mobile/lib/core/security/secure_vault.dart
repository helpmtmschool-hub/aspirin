import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

class SecureVault {
  static const String _keyStoreKey = 'aspirin_vault_master_key';
  final FlutterSecureStorage _storage;

  SecureVault({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Gets or generates the device-bound 256-bit AES Master Key
  Future<Uint8List> getMasterKey() async {
    final existingHex = await _storage.read(key: _keyStoreKey);
    if (existingHex != null && existingHex.length == 64) {
      return Uint8List.fromList(
        List.generate(32, (i) => int.parse(existingHex.substring(i * 2, i * 2 + 2), radix: 16)),
      );
    }

    // Generate cryptographically secure random 256-bit key
    final random = Random.secure();
    final newKey = Uint8List(32);
    for (int i = 0; i < 32; i++) {
      newKey[i] = random.nextInt(256);
    }

    final newHex = newKey.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    await _storage.write(key: _keyStoreKey, value: newHex);
    return newKey;
  }

  /// Returns the internal, non-backup, private vault directory
  Future<Directory> getVaultDirectory({String subfolder = 'videos'}) async {
    final appDir = await getApplicationDocumentsDirectory();
    final vaultDir = Directory('${appDir.path}/vault/$subfolder');
    if (!vaultDir.existsSync()) {
      vaultDir.createSync(recursive: true);
      // Place .nomedia to prevent Android MediaStore scanner from indexing
      final nomediaFile = File('${vaultDir.path}/.nomedia');
      if (!nomediaFile.existsSync()) {
        nomediaFile.createSync();
      }
    }
    return vaultDir;
  }

  /// Gets the private encrypted file handle for a given topic or note ID
  Future<File> getEncryptedFile(String id, {bool isNote = false}) async {
    final vault = await getVaultDirectory(subfolder: isNote ? 'notes' : 'videos');
    return File('${vault.path}/$id.aspirin');
  }

  /// Generates a 16-byte random IV/Nonce
  Uint8List generateRandomIv() {
    final random = Random.secure();
    final iv = Uint8List(16);
    for (int i = 0; i < 16; i++) {
      iv[i] = random.nextInt(256);
    }
    return iv;
  }
}
