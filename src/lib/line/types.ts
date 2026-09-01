/** Minimal LINE Messaging API types used by KnowBody (webhook + Flex). */

export interface LineSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineTextMessage {
  type: "text";
  id: string;
  text: string;
}
export interface LineImageMessage {
  type: "image";
  id: string;
  contentProvider: { type: "line" | "external"; originalContentUrl?: string };
}
export type LineMessageContent =
  | LineTextMessage
  | LineImageMessage
  | { type: string; id: string };

export interface LineEventBase {
  type: string;
  timestamp: number;
  source: LineSource;
  replyToken?: string;
  mode?: string;
}
export interface LineMessageEvent extends LineEventBase {
  type: "message";
  replyToken: string;
  message: LineMessageContent;
}
export interface LinePostbackEvent extends LineEventBase {
  type: "postback";
  replyToken: string;
  postback: { data: string; params?: Record<string, string> };
}
export interface LineFollowEvent extends LineEventBase {
  type: "follow";
  replyToken: string;
}
export type LineEvent =
  | LineMessageEvent
  | LinePostbackEvent
  | LineFollowEvent
  | LineEventBase;

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

/** Outgoing message objects (text + flex are all we send). */
export type LineOutgoingMessage =
  | { type: "text"; text: string; quickReply?: QuickReply }
  | { type: "flex"; altText: string; contents: FlexBubble; quickReply?: QuickReply };

export interface QuickReply {
  items: Array<{
    type: "action";
    action: LineAction;
    imageUrl?: string;
  }>;
}

export type LineAction =
  | { type: "message"; label: string; text: string }
  | { type: "uri"; label: string; uri: string }
  | { type: "postback"; label: string; data: string; displayText?: string }
  | { type: "camera"; label: string }
  | { type: "cameraRoll"; label: string };

/** Flex component subset. */
export interface FlexBubble {
  type: "bubble";
  size?: "nano" | "micro" | "kilo" | "mega" | "giga";
  header?: FlexBox;
  hero?: FlexComponent;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: Record<string, unknown>;
}
export interface FlexBox {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  flex?: number;
  justifyContent?: string;
  alignItems?: string;
  width?: string;
  height?: string;
}
export type FlexComponent =
  | FlexBox
  | FlexText
  | FlexButton
  | FlexSeparator
  | FlexImage
  | FlexFiller;
export interface FlexText {
  type: "text";
  text: string;
  size?: string;
  weight?: "regular" | "bold";
  color?: string;
  wrap?: boolean;
  flex?: number;
  align?: "start" | "end" | "center";
  gravity?: "top" | "bottom" | "center";
  margin?: string;
  maxLines?: number;
}
export interface FlexButton {
  type: "button";
  action: LineAction;
  style?: "primary" | "secondary" | "link";
  color?: string;
  height?: "sm" | "md";
  margin?: string;
}
export interface FlexSeparator {
  type: "separator";
  margin?: string;
  color?: string;
}
export interface FlexImage {
  type: "image";
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: "cover" | "fit";
  margin?: string;
}
export interface FlexFiller {
  type: "filler";
  flex?: number;
}
