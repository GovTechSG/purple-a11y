declare module 'print-message' {
  interface PrintConfig {
    border?: boolean;
    border?: boolean; // Enable border
    color?: string; // Default text color from console
    borderColor?: string; // Border color is yellow
    borderSymbol?: string; // Symbol for top/bottom borders
    sideSymbol?: string; // Symbol for left/right borders
    leftTopSymbol?: string; // Symbol that uses for left top corner
    leftBottomSymbol?: string; // Symbol that uses for left bottom corner
    rightTopSymbol?: string; // Symbol that uses for right top corner
    rightBottomSymbol?: string; // Symbol that uses for right bottom corner
    marginTop?: number; // Margin before border begins
    marginBottom?: number; // Margin after border ends
    paddingTop?: number; // Padding after border begins
    paddingBottom?: number; // Padding before border ends
  }

  /**
   * Print messages to console.
   *
   * @param lines Array of lines
   * @param config Additional params for print
   */
  function print(lines: string[], config?: PrintConfig): void;

  export = print;
}
