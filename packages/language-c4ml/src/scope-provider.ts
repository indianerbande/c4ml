import {
  AstUtils,
  DefaultScopeProvider,
  type LangiumCoreServices,
  type ReferenceInfo,
  type Scope,
} from "langium";

import {
  isC4mlDocument,
  isSoftwareSystemDeclaration,
} from "./generated/ast.js";

export class C4mlDraftScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumCoreServices) {
    super(services);
  }

  override getScope(context: ReferenceInfo): Scope {
    if (context.property !== "value") {
      return super.getScope(context);
    }
    const root = AstUtils.getDocument(context.container).parseResult.value;
    if (!isC4mlDocument(root)) {
      return super.getScope(context);
    }

    const referenceType = this.reflection.getReferenceType(context);
    const elements =
      referenceType === "SoftwareSystemDeclaration"
        ? root.model.elements.filter(isSoftwareSystemDeclaration)
        : root.model.elements;
    return this.createScopeForNodes(elements, super.getScope(context));
  }
}
