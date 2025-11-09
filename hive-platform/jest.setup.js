// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Add pointer event support for Radix UI components
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, params = {}) {
    super(type, params);
    this.pointerId = params.pointerId;
    this.width = params.width;
    this.height = params.height;
    this.pressure = params.pressure;
    this.tangentialPressure = params.tangentialPressure;
    this.tiltX = params.tiltX;
    this.tiltY = params.tiltY;
    this.twist = params.twist;
    this.pointerType = params.pointerType;
    this.isPrimary = params.isPrimary;
  }
};

// Add scrollIntoView mock
Element.prototype.scrollIntoView = jest.fn();

// Add hasPointerCapture and setPointerCapture for Radix UI Select
Element.prototype.hasPointerCapture = jest.fn();
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();

// Add ResizeObserver mock for ScrollArea
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};