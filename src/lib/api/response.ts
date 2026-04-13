import { NextResponse } from "next/server";

type ErrorPayload = {
  error: string;
  details?: unknown;
};

export const jsonOk = <T>(data: T, init?: ResponseInit): NextResponse<T> => {
  return NextResponse.json(data, init);
};

export const jsonError = (error: string, status = 400, details?: unknown): NextResponse<ErrorPayload> => {
  return NextResponse.json(
    {
      error,
      details,
    },
    { status },
  );
};
