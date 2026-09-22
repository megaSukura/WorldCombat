/** LDLib2-backed building blocks; all labels, data and content assets are supplied by callers. */
namespace UiSurfaces {
    export type Text = string | number | boolean | { key: string; args?: any[]; fallback?: string };
    let types: any = null, nativeHost: any = null, screenOwner: any = null, minecraft: any = null, tooltipTypes: any = null, callbacks: any = null, richType: any = null, textType: any = null;
    function host(): any { return nativeHost || (nativeHost = Java.loadClass("dev.worldcombat.core.client.NativeUiHost")); }
    function native(): any {
        if (!types) {
            types = {};
            const names: any = { UI: "com.lowdragmc.lowdraglib2.gui.ui.UI", MUI: "com.lowdragmc.lowdraglib2.gui.ui.ModularUI",
                Element: "com.lowdragmc.lowdraglib2.gui.ui.UIElement", Label: "com.lowdragmc.lowdraglib2.gui.ui.elements.Label",
                Button: "com.lowdragmc.lowdraglib2.gui.ui.elements.Button", Rect: "com.lowdragmc.lowdraglib2.gui.texture.SDFRectTexture",
                Component: "net.minecraft.network.chat.Component", TextWrap: "com.lowdragmc.lowdraglib2.gui.ui.data.TextWrap",
                Scroller: "com.lowdragmc.lowdraglib2.gui.ui.elements.ScrollerView", ScrollerMode: "com.lowdragmc.lowdraglib2.gui.ui.data.ScrollerMode" };
            Object.keys(names).forEach(key => { types[key] = Java.loadClass(names[key]); });
        }
        return types;
    }
    export const Host: any = { width: () => host().width(), height: () => host().height(), mouseX: () => host().mouseX(), mouseY: () => host().mouseY(),
        active: () => host().active(), close: () => { screenOwner = null; host().close(); }, reset: () => { screenOwner = null; host().reset(); },
        meshTexture: (mesh: string, color: number) => host().meshTexture(mesh, intColor(color)), open: (ui: any, title: string) => host().open(ui, title),
        hud: (id: string, ui: any) => host().hud(id, ui) };
    export function wrap(widget: any): any { widget.getTextStyle().textWrap(native().TextWrap.WRAP); return widget; }
    /** Plain text split using the active Minecraft font, retaining every character for paginated readouts. */
    export function lines(value: string, width: number): string[] {
        minecraft = minecraft || Java.loadClass("net.minecraft.client.Minecraft");
        const font = minecraft.getInstance().font, output: string[] = [];
        String(value || "").split("\n").forEach(paragraph => {
            let remaining = paragraph;
            if (!remaining) output.push("");
            while (remaining) {
                let part = String(font.plainSubstrByWidth(remaining, Math.max(1, Math.floor(width))));
                if (!part.length) part = remaining.charAt(0);
                const last = part.charCodeAt(part.length - 1);
                if (last >= 0xd800 && last <= 0xdbff && part.length < remaining.length) part += remaining.charAt(part.length);
                output.push(part); remaining = remaining.slice(part.length);
            }
        }); return output;
    }
    function texts(): any { return textType || (textType = Java.loadClass("dev.worldcombat.core.client.UiText")); }
    export function text(value: any): any { return texts().component(JSON.stringify(value == null ? "" : value)); }
    export function plain(value: any): string { return String(text(value).getString()); }
    export function t(key: string, ...args: any[]): string { return plain({key,args}); }
    export function locale(): string { return String(texts().locale()); }
    /** ARGB literals are unsigned JavaScript numbers; every Java color parameter is a signed int. */
    export function intColor(value: number): number { return value | 0; }
    export function translate(key: string, fallback: string): string {
        return plain({key,fallback});
    }
    /** Replace, rather than append, so live contributions update without recreating the hovered widget. */
    export function tooltip(widget: any, values: string[]): void {
        if (!tooltipTypes) tooltipTypes = { Tooltips: Java.loadClass("com.lowdragmc.lowdraglib2.gui.ui.data.Tooltips"), List: Java.loadClass("java.util.ArrayList") };
        const entries = new (tooltipTypes.List)(); values.forEach(value => entries.add(text(value)));
        const tooltip = tooltipTypes.Tooltips["of(java.util.List)"](entries);
        widget.getStyle()["tooltips(com.lowdragmc.lowdraglib2.gui.ui.data.Tooltips)"](tooltip);
    }
    export function place(element: any, x: number, y: number, width: number, height: number): any {
        return element.lss("position", "absolute").lss("left", x).lss("top", y).lss("width", width).lss("height", height);
    }
    export function surface(element: any, color: number, radius: number): any { element.getStyle().backgroundTexture(native().Rect.of(intColor(color)).setRadius(radius)); return element; }
    export function element(x: number, y: number, width: number, height: number): any { return place(new (native().Element)(), x, y, width, height); }
    export function root(): any { return element(0, 0, Host.width(), Host.height()); }
    export function panel(element: any): any { element.addClass("panel_bg"); return element; }
    export function scroll(parent: any, x: number, y: number, width: number, height: number): any {
        const view=place(new (native().Scroller)(),x,y,width,height);view.getScrollerViewStyle().mode(native().ScrollerMode.VERTICAL);parent.addChild(view);return view;
    }
    /** LDLib exposes both a field and a method named viewContainer; the consumer unwraps the native element in Rhino. */
    export function scrollContent(view: any): any {
        let content:any=null;
        view["viewContainer(java.util.function.Consumer)"]((element:any)=>{content=element;});
        return content;
    }
    export function label(parent: any, value: any, x: number, y: number, width: number, color = 0xff333333): any {
        const widget = place(new (native().Label)(), x, y, width, 14); widget.setText(text(value)); widget.getTextStyle().textColor(intColor(color)); parent.addChild(widget); return widget;
    }
    export function rich(parent: any, x: number, y: number, width: number, height: number): any {
        richType = richType || Java.loadClass("dev.worldcombat.core.client.RichTextLabel");
        const widget = place(new richType(), x, y, width, height); widget.getTextStyle().textColor(intColor(0xff333333)); parent.addChild(widget); return widget;
    }
    export function button(parent: any, value: any, x: number, y: number, width: number, height: number, click: () => void): any {
        const widget = place(new (native().Button)(), x, y, width, height); widget.setText(text(value));
        callbacks = callbacks || Java.loadClass("dev.worldcombat.core.client.ClientCallbacks");
        const guarded = callbacks.runnable("script-ui/button/" + plain(value), () => click());
        widget.setOnClick((_event: any) => guarded.run()); parent.addChild(widget); return widget;
    }
    export function blankButton(widget: any): void { widget.getButtonStyle().baseTexture(native().Rect.of(0)).hoverTexture(native().Rect.of(0x2640a0c0)).pressedTexture(native().Rect.of(0x4060b0d0)); }
    export function active(owner: any): boolean { return screenOwner === owner && Host.active(); }
    export function open(root: any, title: any, owner: any = root): void { screenOwner = owner; Host.open(host().themed(root), plain(title)); }
    export function hud(id: string, root: any): any { const ui = host().themed(root); Host.hud(id, ui); return ui; }
    const rectangles: { [key: string]: any } = Object.create(null);
    export function rect(frame: CombatClientFrame, x: number, y: number, width: number, height: number, color: number, radius = 3): void {
        const key = color + "/" + radius;
        if (!rectangles[key]) rectangles[key] = native().Rect.of(intColor(color)).setRadius(radius);
        rectangles[key].draw(frame.graphics(), 0, 0, x, y, width, height, 0);
    }
}
