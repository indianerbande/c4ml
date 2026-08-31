import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";

const previewWindow =
  new URL(globalThis.location.href).searchParams.get("mode") === "preview";

void (previewWindow
  ? import("./app/detached-preview.component.js").then(
      ({ DetachedPreviewComponent }) => DetachedPreviewComponent,
    )
  : import("./app/app.component.js").then(({ AppComponent }) => AppComponent)
)
  .then((rootComponent) =>
    bootstrapApplication(rootComponent, {
      providers: [provideZonelessChangeDetection()],
    }),
  )
  .catch((error: unknown) => {
    console.error("C4thedral desktop renderer bootstrap failed.", error);
  });
