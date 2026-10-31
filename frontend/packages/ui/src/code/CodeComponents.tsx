import type { CodeItem } from '@common/core';
import { Checkbox, Radio, Select, type CheckboxProps, type RadioGroupProps, type SelectProps } from 'antd';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import { useMemo } from 'react';
import { useCodes } from '../provider/CommonProvider';

interface CodeSourceProps {
  /** 공통코드 그룹 (`USE_YN`) */
  codeGroup?: string;
  /** 직접 옵션. codeGroup 보다 우선 */
  options?: CodeItem[];
  /** 일부 코드만 보여줄 때 */
  filter?: (item: CodeItem) => boolean;
}

interface AllProps {
  /** '전체' 항목(값 '')을 맨 앞에 추가. 문자열이면 그 문구 */
  all?: boolean | string;
}

function useCodeItems({ codeGroup, options, filter }: CodeSourceProps) {
  const { codes, loading } = useCodes(options ? [] : [codeGroup]);
  const items = useMemo(() => {
    const list = options ?? (codeGroup ? codes[codeGroup] : undefined) ?? [];
    return filter ? list.filter(filter) : list;
  }, [options, codes, codeGroup, filter]);
  return { items, loading };
}

function allLabel(all: boolean | string | undefined): string | null {
  if (!all) return null;
  return all === true ? '전체' : all;
}

export type CodeSelectProps = Omit<SelectProps, 'options'> & CodeSourceProps & AllProps;

/** 공통코드 셀렉트. multiple 이면 '전체' 는 붙지 않는다 */
export function CodeSelect({ codeGroup, options, filter, all, ...props }: CodeSelectProps) {
  const { items, loading } = useCodeItems({ codeGroup, options, filter });
  const label = props.mode ? null : allLabel(all);
  const opts = useMemo(
    () => [...(label ? [{ value: '', label }] : []), ...items.map((c) => ({ value: c.code, label: c.codeNm }))],
    [items, label],
  );
  return (
    <Select
      loading={loading}
      options={opts}
      allowClear={!label}
      showSearch={{ optionFilterProp: 'label' }}
      placeholder="선택"
      style={{ width: '100%' }}
      {...props}
    />
  );
}

export type CodeRadioProps = Omit<RadioGroupProps, 'options'> & CodeSourceProps & AllProps;

export function CodeRadio({ codeGroup, options, filter, all, ...props }: CodeRadioProps) {
  const { items } = useCodeItems({ codeGroup, options, filter });
  const label = allLabel(all);
  return (
    <Radio.Group {...props}>
      {label && <Radio value="">{label}</Radio>}
      {items.map((c) => (
        <Radio key={c.code} value={c.code}>
          {c.codeNm}
        </Radio>
      ))}
    </Radio.Group>
  );
}

export type CodeCheckboxProps = Omit<CheckboxGroupProps, 'options'> & CodeSourceProps & {
  /** '전체' 체크박스를 추가 (모두 선택/해제) */
  all?: boolean | string;
};

/** 공통코드 체크박스 그룹. 값은 코드 배열 (`['A', 'B']`) */
export function CodeCheckbox({ codeGroup, options, filter, all, value, onChange, ...props }: CodeCheckboxProps) {
  const { items } = useCodeItems({ codeGroup, options, filter });
  const label = allLabel(all);
  const selected = (value ?? []) as string[];
  const checkedAll = items.length > 0 && items.every((c) => selected.includes(c.code));
  const onAll: CheckboxProps['onChange'] = (e) => onChange?.(e.target.checked ? items.map((c) => c.code) : []);
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {label && (
        <Checkbox checked={checkedAll} indeterminate={!checkedAll && selected.length > 0} onChange={onAll}>
          {label}
        </Checkbox>
      )}
      <Checkbox.Group
        {...props}
        value={selected}
        onChange={onChange}
        options={items.map((c) => ({ value: c.code, label: c.codeNm }))}
      />
    </span>
  );
}
