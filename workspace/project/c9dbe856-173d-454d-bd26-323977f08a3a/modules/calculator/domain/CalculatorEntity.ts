// modules/calculator/domain/CalculatorEntity.ts

import { ValueObject } from '@prisma/client';

export class CalculatorEntity implements ValueObject {
  public id: string;
  public value: string;
  public operator: string;

  private constructor(id: string, value: string, operator: string) {
    this.id = id;
    this.value = value;
    this.operator = operator;
  }

  public static create(id: string, value: string, operator: string): CalculatorEntity {
    return new CalculatorEntity(id, value, operator);
  }

  public updateValue(value: string): void {
    this.value = value;
  }

  public updateOperator(operator: string): void {
    this.operator = operator;
  }
}