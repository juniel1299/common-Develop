import { Col, Form, Row, theme, Typography } from 'antd';
import { useId, useState, type ReactNode } from 'react';
import { FieldControl } from './FieldControl';
import type { BoundArea } from './useArea';
import type { AreaApi, FieldDef, Values } from './types';

export interface FormAreaProps<T extends object> {
  area: AreaApi<T>;
  fields: FieldDef[];
  /** 처음 값이자 reset() 때 돌아갈 값 (API 규약 형식). 상세 조회 후에는 area.set(data) 사용 */
  initialValues?: Partial<T>;
  /** 한 줄에 몇 칸. 24의 약수. 기본 2 */
  columns?: number;
  title?: ReactNode;
  /** 제목 줄 오른쪽 버튼 (저장, 삭제 등) */
  extra?: ReactNode;
  /** 전체 입력 막기 (조회 전용 화면) */
  disabled?: boolean;
  labelWidth?: number;
  /** 폼 아래에 추가로 그릴 내용 */
  children?: ReactNode;
}

/** 입력·상세 폼영역. 필수 항목 표시, 길이·형식 검증, 서버 오류 표시(area.setErrors)를 지원 */
export function FormArea<T extends object>({
  area,
  fields,
  initialValues,
  columns = 2,
  title,
  extra,
  disabled,
  labelWidth = 120,
  children,
}: FormAreaProps<T>) {
  const { token } = theme.useToken();
  // 화면에 영역이 여러 개여도 입력칸 id 가 겹치지 않게 (label 클릭, 접근성)
  const formName = `form${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const bound = area as BoundArea<T>;
  const [initial] = useState(() => bound._bind(fields, initialValues));
  bound._setFields(fields);
  const span = Math.floor(24 / columns);

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '12px 16px 4px',
      }}
    >
      {(title || extra) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>
            {title}
          </Typography.Text>
          <div style={{ display: 'flex', gap: 6 }}>{extra}</div>
        </div>
      )}
      <Form
        form={area.form}
        name={formName}
        initialValues={initial}
        layout="horizontal"
        labelAlign="left"
        labelCol={{ flex: `${labelWidth}px` }}
        wrapperCol={{ flex: '1 1 0', style: { minWidth: 0 } }}
        colon={false}
        disabled={disabled}
        labelWrap
      >
        <Row gutter={24}>
          {fields
            .filter((f) => !f.hidden)
            .map((f) => (
              <Col key={f.name} xs={24} md={Math.min(24, span * Math.min(columns, f.span ?? 1))}>
                <FieldControl field={f} />
              </Col>
            ))}
        </Row>
        {children}
      </Form>
    </div>
  );
}
