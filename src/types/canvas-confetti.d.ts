declare module 'canvas-confetti' {
  export type Shape = 'square' | 'circle' | 'star';

  export interface Options {
    angle?: number;
    colors?: string[];
    decay?: number;
    disableForReducedMotion?: boolean;
    drift?: number;
    flat?: boolean;
    gravity?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    particleCount?: number;
    scalar?: number;
    shapes?: Shape[];
    spread?: number;
    startVelocity?: number;
    ticks?: number;
    zIndex?: number;
  }

  export interface CreateOptions {
    disableForReducedMotion?: boolean;
    resize?: boolean;
    useWorker?: boolean;
  }

  export interface ConfettiFunction {
    (options?: Options): Promise<null>;
    create(canvas: HTMLCanvasElement, options?: CreateOptions): ConfettiFunction;
    reset(): void;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}
