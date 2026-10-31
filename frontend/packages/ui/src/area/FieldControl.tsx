import { Checkbox, DatePicker, Form, Input, InputNumber } from 'antd';
import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';
import { CodeCheckbox, CodeRadio, CodeSelect } from '../code/CodeComponents';
import { DATE_FORMAT, MONTH_FORMAT } from './convert';
import type { FieldDef } from './types';

function labelText(field: FieldDef): string {
  return typeof field.label === 'string' ? field.label : field.name;
}

function buildRules(field: FieldDef): Rule[] {
  const rules: Rule[] = [];
  const label = labelText(field);
  if (field.required) {
    rules.push({
      required: true,
      message: `${label}을(를) 입력하세요.`,
      whitespace: field.type === undefined || field.type === 'text' || field.type === 'textarea',
    });
  }
  if (field.maxLength) rules.push({ max: field.maxLength, message: `${label}은(는) ${field.maxLength}자 이하로 입력하세요.` });
  if (field.pattern) rules.push({ pattern: field.pattern, message: field.patternMessage ?? `${label} 형식이 올바르지 않습니다.` });
  return [...rules, ...(field.rules ?? [])];
}

function control(field: FieldDef): ReactNode {
  const common = { disabled: field.disabled, placeholder: field.placeholder, ...field.inputProps };
  const source = { codeGroup: field.codeGroup, options: field.options };
  switch (field.type) {
    case 'password':
      return <Input.Password maxLength={field.maxLength} {...common} />;
    case 'number':
      return <InputNumber min={field.min} max={field.max} style={{ width: '100%' }} {...common} />;
    case 'textarea':
      return <Input.TextArea rows={3} maxLength={field.maxLength} showCount={!!field.maxLength} {...common} />;
    case 'select':
      return <CodeSelect {...source} all={field.all} {...common} />;
    case 'multiSelect':
      return <CodeSelect {...source} mode="multiple" maxTagCount="responsive" {...common} />;
    case 'radio':
      return <CodeRadio {...source} all={field.all} {...common} />;
    case 'checkbox':
      return <CodeCheckbox {...source} all={field.all} {...common} />;
    case 'yn':
      return <Checkbox {...common} />;
    case 'date':
      return <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} {...common} />;
    case 'month':
      return <DatePicker picker="month" format={MONTH_FORMAT} style={{ width: '100%' }} {...common} />;
    case 'dateRange':
      return <DatePicker.RangePicker format={DATE_FORMAT} allowEmpty={[true, true]} style={{ width: '100%' }} {...common} placeholder={['시작일', '종료일']} />;
    case 'custom':
      return field.render?.() ?? null;
    default:
      return <Input allowClear maxLength={field.maxLength} {...common} />;
  }
}

/** FieldDef 하나를 antd Form.Item 으로 그린다 */
export function FieldControl({ field, compact }: { field: FieldDef; compact?: boolean }) {
  return (
    <Form.Item
      name={field.name}
      label={field.label}
      rules={buildRules(field)}
      required={field.required}
      valuePropName={field.type === 'yn' ? 'checked' : 'value'}
      style={compact ? { marginBottom: 0 } : undefined}
    >
      {control(field)}
    </Form.Item>
  );
}
