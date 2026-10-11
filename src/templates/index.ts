import type { ComponentType } from 'react';
import type { ActivityResult, ActivityTemplate } from '../types';
import { DialogueTemplate } from './DialogueTemplate';
import { MatchTemplate } from './MatchTemplate';
import { RoleplayTemplate } from './RoleplayTemplate';

export interface TemplateProps<C> {
  activityId: string;
  content: C;
  onComplete: (result: ActivityResult) => void;
}

/** To add a template: build a component that takes TemplateProps, then register it here. */
export const templates: Record<ActivityTemplate, ComponentType<TemplateProps<any>>> = {
  dialogue: DialogueTemplate,
  match: MatchTemplate,
  roleplay: RoleplayTemplate,
};
