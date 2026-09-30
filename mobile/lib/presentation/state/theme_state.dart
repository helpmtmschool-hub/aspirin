import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ThemeBrand {
  marrow,
  prepladder,
}

class ThemeState {
  final ThemeMode themeMode;
  final ThemeBrand brand;

  const ThemeState({
    this.themeMode = ThemeMode.dark,
    this.brand = ThemeBrand.marrow,
  });

  ThemeState copyWith({
    ThemeMode? themeMode,
    ThemeBrand? brand,
  }) {
    return ThemeState(
      themeMode: themeMode ?? this.themeMode,
      brand: brand ?? this.brand,
    );
  }
}

class ThemeNotifier extends StateNotifier<ThemeState> {
  ThemeNotifier() : super(const ThemeState());

  void toggleThemeMode() {
    state = state.copyWith(
      themeMode: state.themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
    );
  }

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
  }

  void setBrand(ThemeBrand brand) {
    state = state.copyWith(brand: brand);
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeState>((ref) {
  return ThemeNotifier();
});
