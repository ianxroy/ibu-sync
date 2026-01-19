declare module "react-confetti" {
  import React from "react";

  export interface ConfettiProps {
    width: number;
    height: number;
    numberOfPieces?: number;
    friction?: number;
    wind?: number;
    gravity?: number;
    initialVelocityX?: number;
    initialVelocityY?: number;
    colors?: string[];
    opacity?: number;
    recycle?: boolean;
    run?: boolean;
    confettiSource?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    drawShape?: (ctx: CanvasRenderingContext2D) => void;
    onConfettiComplete?: (confetti: any) => void;
    className?: string;
    style?: React.CSSProperties;
    tweenDuration?: number;
  }

  export default class Confetti extends React.Component<ConfettiProps> {}
}
