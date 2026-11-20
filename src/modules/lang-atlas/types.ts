import type { Tooltip } from '@base-ui/react/tooltip';
import type { LangFeatures } from '@/core/types';
import type { ChangeRequestDialogHandle } from '@/modules/lang-requests/types';

/** The handle of the atlas' single feature description tooltip. */
export type FeatureTooltipHandle = Tooltip.Handle<LangFeatures>;

/** The atlas' single dialog and tooltip, which every chip opens. */
export type LanguageCardHandles = {
  dialog: ChangeRequestDialogHandle;
  tooltip: FeatureTooltipHandle;
};
