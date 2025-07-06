// datas.ts

export enum ContextTagType {
    Element = 'element',
    Box = 'box',
}

export enum ContextElementType {
    UIElement = 'UIElement',
    BoundingBox = 'BoundingBox',
    // Add more types as needed (e.g., FigmaDesign)
}

export interface UIElementContext {
    id: string;
    type: ContextElementType.UIElement;
    selector: string;
    role?: string;
    text?: string;
    tagName?: string;
}

export interface BoundingBoxContext {
    id: string;
    type: ContextElementType.BoundingBox;
    value: string; // e.g., "(left,top,width,height)"
}

export type ContextElement = UIElementContext | BoundingBoxContext;

export interface InfoContext {
    contextElements: ContextElement[];
}

export interface UserInstructionMessage {
    type: 'user_instruction';
    userInstruction: string;
    infoContext: InfoContext;
    message_id?: string;
}

export interface AckMessage {
    type: 'ack_message';
    message_id: string;
} 