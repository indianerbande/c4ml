import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";

import { AppComponent } from "./app/app.component.js";

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
}).catch((error: unknown) => {
  console.error("C4ML editor bootstrap failed.", error);
});
