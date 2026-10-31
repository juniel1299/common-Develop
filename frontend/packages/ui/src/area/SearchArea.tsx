import { DownOutlined, ReloadOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Col, Form, Row, Space, theme } from 'antd';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { FieldControl } from './FieldControl';
import type { BoundArea } from './useArea';
import type { AreaApi, FieldDef, Values } from './types';

export interface SearchAreaProps<T extends object> {
  area: AreaApi<T>;
  fields: FieldDef[];
  /** 처음 값이자 '초기화' 때 돌아갈 값 (API 규약 형식) */
  initialValues?: Partial<T>;
  /** 조회 버튼·Enter 시 호출. 값은 area.get() 과 같다 */
  onSearch: (values: T) => void;
  /** 초기화 버튼 후 추가로 할 일 */
  onReset?: () => void;
  /** 한 줄에 몇 칸. 24의 약수 (1, 2, 3, 4, 6). 기본 4 */
  columns?: number;
  /** 이 줄 수를 넘으면 '펼치기' 로 접는다. 기본 2 */
  collapsedRows?: number;
  labelWidth?: number;
  loading?: boolean;
  /** 조회 버튼 왼쪽에 추가할 버튼 */
  extra?: ReactNode;
}

/**
 * 조회영역.
 * select·radio 는 기본으로 '전체' 가 붙고, 빈 칸은 조회 파라미터에서 자동으로 빠진다 (@common/core http).
 */
export function SearchArea<T extends object>({
  area,
  fields,
  initialValues,
  onSearch,
  onReset,
  columns = 4,
  collapsedRows = 2,
  labelWidth = 90,
  loading,
  extra,
}: SearchAreaProps<T>) {
  const { token } = theme.useToken();
  // 화면에 영역이 여러 개여도 입력칸 id 가 겹치지 않게 (label 클릭, 접근성)
  const formName = `search${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const bound = area as BoundArea<T>;
  const defs = useMemo(
    () => fields.map((f) => ((f.type === 'select' || f.type === 'radio') && f.all === undefined ? { ...f, all: true } : f)),
    [fields],
  );
  const [initial] = useState(() => bound._bind(defs, initialValues));
  bound._setFields(defs);
  const [expanded, setExpanded] = useState(false);

  const span = Math.floor(24 / columns);
  const visible = defs.filter((f) => !f.hidden);
  let used = 0;
  const limit = columns * collapsedRows;
  const cells = visible.map((f) => {
    const s = Math.min(columns, f.span ?? 1);
    const start = used;
    used += s;
    return { field: f, span: s, folded: start + s > limit };
  });
  const canFold = cells.some((c) => c.folded);

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '12px 16px',
      }}
    >
      <Form
        form={area.form}
        name={formName}
        initialValues={initial}
        layout="horizontal"
        labelAlign="left"
        labelCol={{ flex: `${labelWidth}px` }}
        wrapperCol={{ flex: '1 1 0', style: { minWidth: 0 } }}
        colon={false}
        onFinish={() => onSearch(area.get())}
      >
        <Row gutter={[16, 8]}>
          {cells.map(({ field, span: s, folded }) => (
            <Col
              key={field.name}
              xs={24}
              md={Math.max(12, span * s)}
              lg={Math.min(24, span * s)}
              style={folded && !expanded ? { display: 'none' } : undefined}
            >
              <FieldControl field={field} compact />
            </Col>
          ))}
        </Row>
        <Row justify="end" style={{ marginTop: 12 }}>
          <Space size={6}>
            {canFold && (
              <Button type="text" size="small" onClick={() => setExpanded((v) => !v)} icon={expanded ? <UpOutlined /> : <DownOutlined />}>
                {expanded ? '접기' : '펼치기'}
              </Button>
            )}
            {extra}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                area.reset();
                onReset?.();
              }}
            >
              초기화
            </Button>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
              조회
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
}
