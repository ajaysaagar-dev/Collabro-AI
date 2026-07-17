import { Calculator } from '../domain/CalculatorEntity';

export class CalculatorService {
  private calculator: Calculator;

  constructor(initialValue: string = '0') {
    this.calculator = new Calculator(initialValue);
  }

  add(value: string): Calculator {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Invalid number');
    }
    this.calculator.value = (parseFloat(this.calculator.value) + numValue).toString();
    return this.calculator;
  }

  subtract(value: string): Calculator {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Invalid number');
    }
    this.calculator.value = (parseFloat(this.calculator.value) - numValue).toString();
    return this.calculator;
  }

  multiply(value: string): Calculator {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Invalid number');
    }
    this.calculator.value = (parseFloat(this.calculator.value) * numValue).toString();
    return this.calculator;
  }

  divide(value: string): Calculator {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Invalid number');
    }
    if (numValue === 0) {
      throw new Error('Division by zero');
    }
    this.calculator.value = (parseFloat(this.calculator.value) / numValue).toString();
    return this.calculator;
  }

  setOperator(operator: string): Calculator {
    const validOperators = ['+', '-', '*', '/'];
    if (!validOperators.includes(operator)) {
      throw new Error('Invalid operator');
    }
    this.calculator.operator = operator;
    return this.calculator;
  }

  calculate(): Calculator {
    const currentValue = parseFloat(this.calculator.value);
    if (isNaN(currentValue)) {
      throw new Error('Invalid current value');
    }

    switch (this.calculator.operator) {
      case '+':
        this.calculator.value = (currentValue + currentValue).toString();
        break;
      case '-':
        this.calculator.value = (currentValue - currentValue).toString();
        break;
      case '*':
        this.calculator.value = (currentValue * currentValue).toString();
        break;
      case '/':
        if (currentValue === 0) {
          throw new Error('Division by zero');
        }
        this.calculator.value = (currentValue / currentValue).toString();
        break;
      default:
        throw new Error('No operator set');
    }

    this.calculator.operator = '';
    return this.calculator;
  }

  clear(): Calculator {
    this.calculator = new Calculator('0');
    return this.calculator;
  }

  reset(): Calculator {
    this.calculator = new Calculator('0');
    return this.calculator;
  }

  getDisplayValue(): string {
    return this.calculator.value;
  }

  getOperator(): string {
    return this.calculator.operator;
  }

  getCalculator(): Calculator {
    return this.calculator;
  }
}