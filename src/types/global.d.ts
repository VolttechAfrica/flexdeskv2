import { Tracer } from 'dd-trace';

declare global {
  var ddTracer: Tracer | undefined;
} 