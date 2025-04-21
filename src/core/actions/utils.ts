export type ActionResult<T = undefined, E = string> =
  | ActionSuccess<T>
  | ActionError<E>;

export type ActionSuccess<T> = {
  success: true;
  result: T;
};

export type ActionError<E> = {
  success: false;
  error: E;
};

export function actionSuccess<T>(result: T): ActionSuccess<T> {
  return {
    success: true,
    result,
  };
}

export function actionError<E>(error: E): ActionError<E> {
  return {
    success: false,
    error,
  };
}
