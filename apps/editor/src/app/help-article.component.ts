import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { HelpTopic } from "./help-content.js";

@Component({
  selector: "c4ml-help-article",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./help-article.component.html",
  styleUrl: "./help-article.component.css",
})
export class HelpArticleComponent {
  readonly topic = input.required<HelpTopic>();
  readonly availabilityLabel = input.required<string>();
}
