import type { ActionError, ActionSuccess } from '@/core/types';

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
