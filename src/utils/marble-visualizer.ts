/**
 * Marble Visualizer for RxJS Streams
 *
 * Provides a simple interface for visualizing RxJS observables
 * using ws-marbles integration
 */

import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createMarbleServer } from './marble-server';

export interface MarbleVisualizerConfig {
  port?: number;
  host?: string;
  autoOpen?: boolean;
  title?: string;
}

export interface MarbleVisualizer {
  connect(): Promise<void>;
  disconnect(): void;
  clear(): void;
  emit(streamId: string, value: any): void;
  complete(streamId: string): void;
  debug<T>(streamId: string, label: string): (source: Observable<T>) => Observable<T>;
}

export function createMarbleVisualizer(config: MarbleVisualizerConfig = {}): MarbleVisualizer {
  const server = createMarbleServer({
    port: config.port || 3000,
    host: config.host || 'localhost',
  });

  const streams = new Map<string, Subject<any>>();

  return {
    async connect(): Promise<void> {
      await server.startBunServer();
      console.log(`✅ Marble visualizer running on http://${config.host || 'localhost'}:${config.port || 3000}`);
    },

    disconnect(): void {
      server.stop();
    },

    clear(): void {
      streams.forEach((subject) => subject.complete());
      streams.clear();
    },

    emit(streamId: string, value: any): void {
      let subject = streams.get(streamId);
      if (!subject) {
        subject = new Subject();
        streams.set(streamId, subject);
        server.registerStream({
          streamId,
          name: streamId,
          observable: subject.asObservable(),
        });
      }
      subject.next(value);
    },

    complete(streamId: string): void {
      const subject = streams.get(streamId);
      if (subject) {
        subject.complete();
        streams.delete(streamId);
      }
    },

    debug<T>(streamId: string, label: string): (source: Observable<T>) => Observable<T> {
      return (source: Observable<T>) => {
        let subject = streams.get(streamId);
        if (!subject) {
          subject = new Subject();
          streams.set(streamId, subject);

          // Generate unique color for each stream
          const colors = [
            '#4CAF50',
            '#2196F3',
            '#FF9800',
            '#9C27B0',
            '#F44336',
            '#00BCD4',
            '#FF5722',
            '#795548',
            '#607D8B',
            '#E91E63',
            '#3F51B5',
            '#009688',
            '#FFC107',
            '#8BC34A',
            '#FFEB3B',
          ];
          const colorIndex = streams.size % colors.length;

          server.registerStream({
            streamId,
            name: label,
            observable: subject.asObservable(),
          });
        }

        const currentSubject = subject;
        return source.pipe(
          tap({
            next: (value) => currentSubject.next(value),
            error: (err) => currentSubject.error(err),
            complete: () => currentSubject.complete(),
          })
        );
      };
    },
  };
}
