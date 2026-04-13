import type { PropsWithChildren } from "react";
import clsx from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export const Card = ({ children, className }: CardProps) => {
  return <section className={clsx("swiss-section rounded-2xl p-4 shadow-sm", className)}>{children}</section>;
};
