import { Registration } from "./registration";

export class TransientStore {
  private readonly transients: Map<Registration<any, any>, any[]> = new Map();

  has(registration: Registration<any, any>) {
    const stored = this.transients.get(registration);
    return stored !== undefined && stored.length > 0;
  }

  take(registration: Registration<any, any>): null | any {
    return this.transients.get(registration)!.pop();
  }

  store(registration: Registration<any, any>, instance: any) {
    const stored = this.transients.get(registration) ?? [];
    stored.push(instance);
    this.transients.set(registration, stored);
  }
}
