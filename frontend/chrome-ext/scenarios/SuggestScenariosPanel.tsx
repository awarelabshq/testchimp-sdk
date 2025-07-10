import React, { useState } from 'react';
import { Button, Input, Space, Drawer, Skeleton, message } from 'antd';
import { ContextElement, InfoContextItemType, TestScenarioDetail, ContextElementType, SuggestTestScenariosRequest } from '../datas';
import { ContextWindowPanel, ContextTag } from '../components/ContextWindowPanel';
import { suggestTestScenarios } from '../apiService';
import { ScenarioCard } from './ScenarioCard';
import { simplifyDOMForLLM } from '../html_utils';

interface SuggestScenariosPanelProps {
    visible: boolean;
    onCancel: () => void;
    onAddAll: (scenarios: TestScenarioDetail[]) => void; // Parent should refresh scenario list
    selectedScreen?: string;
    selectedState?: string;
}

export const SuggestScenariosPanel: React.FC<SuggestScenariosPanelProps> = ({ visible, onCancel, onAddAll, selectedScreen, selectedState }) => {
    const [contextTags, setContextTags] = useState<ContextTag[]>([]);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggested, setSuggested] = useState<TestScenarioDetail[] | null>(null);
    const [addingAll, setAddingAll] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [editedSuggested, setEditedSuggested] = useState<TestScenarioDetail[]>([]);
    React.useEffect(() => { setEditedSuggested(suggested || []); }, [suggested]);

    // Context menu for adding elements/areas
    const contextMenu = (
        <div style={{ background: '#222', borderRadius: 4, minWidth: 120, padding: 4 }}>
            <Button type="text" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setContextMenuOpen(false); /* TODO: implement element selection */ }}>Add Element</Button>
            <Button type="text" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setContextMenuOpen(false); /* TODO: implement area selection */ }}>Add Area</Button>
        </div>
    );
    const handleRemove = (idx: number) => {
        setContextTags(tags => tags.filter((_, i) => i !== idx));
    };
    const handleClear = () => {
        setContextTags([]);
    };

    const handleSuggest = async () => {
        setLoading(true);
        setSuggested(null);
        try {
            // Build context for API
            const contextItems = contextTags.map(tag => ({
                id: tag.id,
                type: InfoContextItemType.SCREEN_INFO,
                data: { textContent: JSON.stringify(tag) },
            }));
            const domSnapshot = JSON.stringify(simplifyDOMForLLM(document.body));
            const req: SuggestTestScenariosRequest = {
                screenState: {
                    name: selectedScreen,
                    state: selectedState
                },
                domSnapshot: domSnapshot,
                context: { contextItems },
                prompt: prompt || undefined,
            };
            const res = await suggestTestScenarios(req);
            setSuggested(res.suggestedTestScenarios || []);
        } catch (err) {
            message.error('Failed to suggest scenarios');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAll = async () => {
        if (!editedSuggested || editedSuggested.length === 0) return;
        setAddingAll(true);
        try {
            await onAddAll(editedSuggested);
        } catch (err) {
            message.error('Failed to add scenarios');
        } finally {
            setAddingAll(false);
        }
    };

    // Callback to update a scenario in editedSuggested by index
    const handleScenarioChange = (idx: number, updated: TestScenarioDetail) => {
        setEditedSuggested(list => list.map((s, i) => i === idx ? updated : s));
    };
    // Callback to remove a scenario from editedSuggested by index
    const handleScenarioDelete = (idx: number) => {
        setEditedSuggested(list => list.filter((_, i) => i !== idx));
    };

    // Panel content logic
    let content;
    if (loading) {
        content = <Skeleton active paragraph={{ rows: 6 }} title={false} />;
    } else if (suggested) {
        content = (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 16 }}>
                    {editedSuggested.length === 0 ? (
                        <div>No scenarios suggested.</div>
                    ) : (
                        editedSuggested.map((s, idx) => (
                            <div key={s.id || s.ordinalId || idx} style={{ marginBottom: 12 }}>
                                <ScenarioCard
                                    scenario={{ ...s, screenName: selectedScreen, screenState: selectedState }}
                                    onUpdated={undefined}
                                    onAction={undefined}
                                    // @ts-ignore
                                    titleWrap
                                    isSuggestion
                                    onDelete={() => handleScenarioDelete(idx)}
                                    selectedScreen={selectedScreen}
                                    selectedState={selectedState}
                                    // New: update callback for edits/saves
                                    onScenarioChange={updated => handleScenarioChange(idx, updated)}
                                />
                            </div>
                        ))
                    )}
                </div>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" loading={addingAll} onClick={handleAddAll} disabled={editedSuggested.length === 0}>Add All</Button>
                </Space>
            </div>
        );
    } else {
        content = (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {/* Any scrollable area above context window, if needed (currently empty) */}
                </div>
                <div style={{ position: 'sticky', bottom: 96, zIndex: 3, background: '#222', paddingBottom: 8 }}>
                    <ContextWindowPanel
                        contextTags={contextTags}
                        onRemove={handleRemove}
                        onClear={handleClear}
                        onAddTag={tag => setContextTags(tags => [...tags, tag])}
                    />
                </div>
                <div style={{ position: 'sticky', bottom: 0, background: '#222', zIndex: 2, paddingTop: 16 }}>
                    <Input.TextArea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="(Optional) Describe any particular aspects / areas you want to focus on..."
                        rows={3}
                        style={{ marginBottom: 16 }}
                    />
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button type="primary" onClick={handleSuggest}>Suggest</Button>
                    </Space>
                </div>
            </div>
        );
    }

    return (
        <Drawer
            open={visible}
            placement="bottom"
            height={"80vh"}
            closable={false}
            mask={false}
            style={{ zIndex: 1001 }}
            bodyStyle={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}
            onClose={onCancel}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {content}
            </div>
        </Drawer>
    );
}; 