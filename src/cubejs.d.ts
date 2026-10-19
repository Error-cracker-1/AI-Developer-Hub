declare module 'cubejs' {
  class Cube {
    constructor(state?: unknown);
    move(algorithm: string): this;
    asString(): string;
    solve(maxDepth?: number): string;
    static initSolver(): void;
    static fromString(facelets: string): Cube;
  }
  export default Cube;
}
