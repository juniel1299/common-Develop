import type { PageResult } from '@common/core';
import { CodeSelect, LayoutMap, useCodes, useHttp, useLayoutMap, type LayoutItemStyle } from '@common/ui';
import { App, Button, Descriptions, Empty, Form, Input, InputNumber, Radio, Segmented, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MockLayoutItem, MockLayoutMap, MockUser } from '../mock/db';

type Item = MockLayoutItem & { userNm?: string | null };

const STYLE: Record<string, LayoutItemStyle> = {
  used: { fill: '#dbeafe', stroke: '#2563eb', textColor: '#1e3a8a' },
  empty: { fill: '#ffffff', stroke: '#94a3b8' },
  ROOM: { fill: '#f1f5f9', stroke: '#64748b' },
  ETC: { fill: '#fef9c3', stroke: '#ca8a04', dashed: true },
};

const styleOf = (i: Item) => (i.itemType === 'SEAT' ? (i.userId ? STYLE.used : STYLE.empty) : STYLE[i.itemType]);

const NEW_ITEM: Record<string, { prefix: string; label: string; width: number; height: number }> = {
  SEAT: { prefix: 'S', label: '좌석', width: 60, height: 40 },
  ROOM: { prefix: 'R', label: '회의실', width: 160, height: 120 },
  ETC: { prefix: 'E', label: '시설', width: 100, height: 60 },
};

/** 샘플: 좌석 배치도. 조회 모드는 사용 현황, 편집 모드는 끌어서 배치하고 일괄 저장 */
export function LayoutPage() {
  const http = useHttp();
  const { message } = App.useApp();
  const { codes } = useCodes(['LAYOUT_TYPE']);
  const layout = useLayoutMap<Item>();
  const [maps, setMaps] = useState<MockLayoutMap[]>([]);
  const [mapId, setMapId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Item[]>([]);

  const map = maps.find((m) => m.mapId === mapId);
  const loadItems = useCallback(async (id: string) => setItems(await http.get<Item[]>('/layouts/items', { mapId: id })), [http]);

  useEffect(() => {
    void http.get<MockLayoutMap[]>('/layouts').then((list) => {
      setMaps(list);
      if (list[0]) setMapId(list[0].mapId);
    });
    void http.getPage<MockUser>('/users', { size: 1000, useYn: 'Y' }).then((r: PageResult<MockUser>) => setUsers(r.list));
  }, [http]);

  useEffect(() => {
    if (mapId) void loadItems(mapId);
  }, [mapId, loadItems]);

  function guard(next: () => void) {
    if (layout.hasChanges()) return void message.warning('저장하지 않은 변경이 있습니다. 먼저 저장하세요.');
    next();
  }

  function add(itemType: string) {
    const t = NEW_ITEM[itemType]!;
    const itemId = layout.nextId(t.prefix);
    layout.addItem({ mapId: mapId!, itemId, itemNm: itemType === 'SEAT' ? `${Number(itemId.slice(1))}번` : t.label, itemType, width: t.width, height: t.height, shape: 'rect', userId: null });
  }

  async function save() {
    if (!layout.hasChanges()) return void message.info('변경된 내용이 없습니다.');
    const r = await http.saveRows('/layouts/items', layout.getChanges());
    message.success(`저장했습니다. (추가 ${r.inserted}, 수정 ${r.updated}, 삭제 ${r.deleted})`);
    await loadItems(mapId!);
  }

  const one = selected.length === 1 ? selected[0]! : null;
  function update(patch: Partial<Item>) {
    if (!one) return;
    layout.updateItem(one.itemId, patch);
    setSelected(layout.getSelected());
  }

  const seats = items.filter((i) => i.itemType === 'SEAT');
  const used = seats.filter((i) => i.userId).length;
  const userOptions = useMemo(() => users.map((u) => ({ value: u.userId, label: `${u.userNm} (${u.userId})` })), [users]);
  const typeNm = (code: string) => codes.LAYOUT_TYPE?.find((c) => c.code === code)?.codeNm ?? code;

  const toolbar = editing ? (
    <>
      {Object.entries(NEW_ITEM).map(([type, t]) => (
        <Button key={type} onClick={() => add(type)}>
          {t.label} 추가
        </Button>
      ))}
      <Button disabled={!selected.length} onClick={() => layout.rotateSelected()}>
        회전
      </Button>
      <Button disabled={!selected.length} onClick={() => layout.deleteSelected()}>
        삭제
      </Button>
      <Button type="primary" onClick={save}>
        저장
      </Button>
    </>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Space wrap>
        <Segmented
          value={mapId ?? undefined}
          options={maps.map((m) => ({ value: m.mapId, label: m.mapNm }))}
          onChange={(v) => guard(() => setMapId(String(v)))}
        />
        <Segmented
          value={editing ? 'edit' : 'view'}
          options={[
            { value: 'view', label: '조회' },
            { value: 'edit', label: '편집' },
          ]}
          onChange={(v) => guard(() => setEditing(v === 'edit'))}
        />
        {!editing ? (
          <Typography.Text type="secondary">
            좌석 {seats.length}석 · 사용 {used} · 빈자리 {seats.length - used}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">끌어서 이동 · 모서리로 크기 조절 · Shift+클릭 여러 개 선택 · 방향키 이동 · Delete 삭제 · 휠 확대</Typography.Text>
        )}
      </Space>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 12 }}>
        {map ? (
          <LayoutMap
            layout={layout}
            map={map}
            items={items}
            editable={editing}
            title={map.mapNm}
            extra={toolbar}
            height={560}
            itemStyle={styleOf}
            tooltip={(i) => (i.itemType === 'SEAT' ? `${i.itemNm} · ${i.userNm ?? '빈자리'}` : (i.itemNm ?? typeNm(i.itemType)))}
            legend={[
              { label: '사용 중', color: STYLE.used!.fill! },
              { label: '빈자리', color: STYLE.empty!.fill! },
              { label: '회의실', color: STYLE.ROOM!.fill! },
              { label: '시설', color: STYLE.ETC!.fill! },
            ]}
            onSelect={setSelected}
          />
        ) : (
          <Empty />
        )}
        <div style={{ paddingTop: 30 }}>
          {!one ? (
            <Empty description={selected.length > 1 ? `${selected.length}개 선택됨` : '항목을 선택하세요'} />
          ) : editing ? (
            <Form layout="vertical" size="small">
              <Typography.Text strong>항목 {one.itemId}</Typography.Text>
              <Form.Item label="이름" style={{ marginTop: 8 }}>
                <Input value={one.itemNm ?? ''} maxLength={50} onChange={(e) => update({ itemNm: e.target.value })} />
              </Form.Item>
              <Form.Item label="종류">
                <CodeSelect codeGroup="LAYOUT_TYPE" value={one.itemType} onChange={(v: unknown) => update({ itemType: String(v) })} />
              </Form.Item>
              <Form.Item label="모양">
                <Radio.Group value={one.shape ?? 'rect'} onChange={(e) => update({ shape: e.target.value })}>
                  <Radio.Button value="rect">사각형</Radio.Button>
                  <Radio.Button value="circle">원형</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Space>
                <Form.Item label="가로">
                  <InputNumber min={10} step={10} value={one.width} onChange={(v) => v && update({ width: v })} />
                </Form.Item>
                <Form.Item label="세로">
                  <InputNumber min={10} step={10} value={one.height} onChange={(v) => v && update({ height: v })} />
                </Form.Item>
              </Space>
              {one.itemType === 'SEAT' ? (
                <Form.Item label="사용자">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="배정 안 함"
                    value={one.userId ?? undefined}
                    options={userOptions}
                    onChange={(v?: string) => update({ userId: v ?? null, userNm: users.find((u) => u.userId === v)?.userNm ?? null })}
                  />
                </Form.Item>
              ) : null}
            </Form>
          ) : (
            <Descriptions
              column={1}
              size="small"
              bordered
              title={one.itemNm ?? one.itemId}
              items={[
                { label: '항목키', children: one.itemId },
                { label: '종류', children: typeNm(one.itemType) },
                ...(one.itemType === 'SEAT' ? [{ label: '사용자', children: one.userNm ?? '빈자리' }] : []),
                { label: '크기', children: `${one.width} × ${one.height}` },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
