/** Cobblemon facts and native Summary transport adapted to reusable script interfaces. */
namespace CobblemonCompanionUi {
    /** Each visual contribution opts into the lifecycle callbacks it actually needs. */
    export interface Effects {
        target?(frame: CombatClientFrame): void;
        cancelTarget?(): void;
        tick?(): void;
        status?(actor: any): string;
    }
    export interface Configuration {
        id: string; legacyIds?: string[]; channel: string; actionPrefix: string; selectionScene: string;
        world: { select(state: any, details: any, reason: string): void; target(value: any): void; explainReason(reason: string): string; };
        effects?: Effects; intents?: any; phases?: any; reasons?: any; background?: number; accent?: number; menuBase?: number; menuHighlight?: number;
        describe?(skill: any, state: any): string; hudExtra?(details: any): string; fieldRenderer?(kind: string): SchemaEditor.Renderer | null;
        menuRenderer?(root: any, item: UiState.MenuItem, x: number, y: number, choose: () => void): void;
        validateSelection?(item: any, aim: any): string;
        executeCommand?(item: any, aim: any, bridge: any): boolean;
        targetResolvers?: { [mode: string]: (state: any, item: any, bridge: any) => any };
    }
    export function install(config: Configuration): void {
        const J: any = Java;
        const Bridge: any = J.loadClass("dev.worldcombat.cobblemon.client.CompanionContentClient");
        const Host: any = J.loadClass("dev.worldcombat.core.client.NativeUiHost");
        const Summary: any = J.loadClass("dev.worldcombat.cobblemon.client.SummaryContentBridge");
        const Minecraft: any = J.loadClass("net.minecraft.client.Minecraft");
        const Element: any = J.loadClass("com.lowdragmc.lowdraglib2.gui.ui.UIElement");
        const Component: any = J.loadClass("net.minecraft.network.chat.Component");
        let state: any = {}, details: any = null, lastIdentity = "", ticks = 0;
        let hud: any = null, title: any, hint: any, cards: any[] = [], bars: any[] = [];
        let viewport = "", modal = "", pending: any = null, loadoutIdentity = "", language = "";
        let attributeRows: AttributeView.Row[] | null = null, attributeNature: any = null;
        const attributes = new AttributeView.View(() => close());
        let notice = "", noticeUntil = 0, settingMove = 0;
        const revisions = new UiState.RevisionGate();
        let requestedMove = "", requestedLoaded = "";
        let inspectPending: string | null = null, inspectQueued = false, invalidated = false, notificationRevision = -1;
        let feedbackSequence = -1;
        const summaries: { [pokemon: string]: any } = Object.create(null);
        let supportedMoves: { [move: string]: boolean } = Object.create(null);
        let manifestIdentity = "";
        const intents = config.intents || {}, phases = config.phases || {}, reasons = config.reasons || {};
        const tr = (key: string, ...args: any[]) => UiSurfaces.plain({key:"worldcombat.ui."+key,args});
        const plain=UiSurfaces.plain;
        const text = UiSurfaces.text, place = UiSurfaces.place, surface = UiSurfaces.surface, label = UiSurfaces.label, button = UiSurfaces.button, root = UiSurfaces.root;
        const editor = new SchemaEditor.Editor({ title: {key:"worldcombat.ui.skill_details"}, background: config.background, accent: config.accent, readoutLabel: {key:"worldcombat.ui.description"}, settingsLabel: {key:"worldcombat.ui.preferences"}, readoutFooter: {key:"worldcombat.ui.hover_values"},
            change: (tab, field, value) => saveField(tab, field, value), reset: (tab, field) => {
                if (revisions.begin(() => Bridge.request(config.channel, state.pokemon, JSON.stringify({op:"reset",move:tab.id,path:field.path,expected:tab.revision == null ? null : tab.revision})))) announce(tr("resetting", field.label));
            }, select: id => { requestedMove = id; requestedLoaded = ""; inspect(); showSettings(); }, close: () => close(), renderer: config.fieldRenderer });
        const radial = new RadialMenu.View({ id:config.id + ":commands", legacyIds:(config.legacyIds||[]).map(id=>id+":commands"), customize:()=>{modal="layout";}, title: () => tr("command_title",state.name || tr("companion")), backLabel: () => state.backKey, confirmLabel: () => state.confirmKey, commandLabel: () => state.commandKey,
            choose: item => chooseCommand(item), close: () => close(), reject: reason => announce(reason), base: config.menuBase, highlight: config.menuHighlight, accent: config.accent,
            renderItem: config.menuRenderer });
        const picking = new UiState.Selection<any, any>({
            validate: (item, aim) => item.target === "block" && (!aim || aim.reason) ? tr("choose_block") : config.validateSelection ? config.validateSelection(item, aim) : item.target === "entity" && (!aim || aim.target === "00000000-0000-0000-0000-000000000000") ? tr("choose_target") : "",
            submit: (item, aim) => submit(item, aim), continuous: item => !!item.continuous,
            changed: item => { pending = item; if (!item) clearTarget(); }, reject: reason => announce(reason)
        });
        function selectionAim(item: any): any { return JSON.parse(item.target === "block" ? Bridge.blockAim() : Bridge.look()); }
        function announce(value: any): void { notice = plain(value); noticeUntil = ticks + 100; if (modal === "settings") editor.notice(value); if (modal === "attributes") attributes.notice(value); }
        function saveField(skill: any, field: any, value: any): void {
            if (revisions.begin(() => Bridge.request(config.channel, state.pokemon, JSON.stringify({ op: "configure", move: skill.id,
                expected: skill.revision == null ? null : skill.revision, patch: UiState.patch(field.path, value) })))) announce(tr("saving",field.label));
        }
        function inspect(): void {
            if (revisions.busy) { inspectQueued = true; return; }
            const requested = modal === "attributes" ? "@attributes" : requestedMove;
            if (inspectPending !== null) { if (inspectPending !== requested || invalidated) inspectQueued = true; return; }
            if (state.pokemon) {
                const request: any = { op: modal === "attributes" ? "attributes" : "inspect" }; if (requestedMove && modal !== "attributes") request.move = requestedMove;
                inspectPending = requested; invalidated = false;
                Bridge.request(config.channel, state.pokemon, JSON.stringify(request));
            }
        }
        function hasAbilities(): boolean {
            return !!(details && details.skills && details.skills.length) ||
                !!(details && details.menu && details.menu.some((item: any) => item.capability && !item.disabled)) ||
                !!(state.skills && state.skills.some((s: any) => String(s.id).indexOf(config.actionPrefix) === 0));
        }
        function canCommand(): boolean { return !!state.pokemon && !state.inspection; }
        function skillDetail(id: string): any {
            const raw = String(id || ""), key = (raw.indexOf(config.actionPrefix) === 0 ? raw.slice(config.actionPrefix.length) : raw).replace(/^cobblemon\.move\./, "");
            if (details && details.requested && details.requested.id === key) return details.requested;
            const known = details && details.skills || [];
            for (let i = 0; i < known.length; i++) if (known[i].id === key) return known[i];
            return null;
        }
        function localName(skill: any): string {
            const known = skillDetail(skill.id || skill.label);
            if (known) return known.nameKey ? plain({key:known.nameKey}) : plain(known.name);
            const label = String(skill.label || ""), id = String(skill.id || "").replace(config.actionPrefix, "");
            if (label && label.indexOf("cobblemon.move.") !== 0 && label.indexOf(config.actionPrefix) !== 0) return label;
            return id ? String(Component.translatable("cobblemon.move." + id).getString()) : tr("empty_slot");
        }
        function buildHud(): void {
            const r = root(), w = Host.width(), h = Host.height(), gap = 6, safe = Math.max(12, Math.round(w * 0.04));
            const cardW = Math.max(64, Math.min(92, Math.floor((w - safe * 2 - gap * 3) / 4)));
            const total = cardW * 4 + gap * 3, left = Math.max(safe, Math.floor((w - total) / 2));
            const bottom = Math.max(64, Math.round(h * 0.14)), cardY = h - bottom - 32;
            title = label(r, "", left, cardY - 22, total, 0xffeeeeee);
            cards = []; bars = [];
            for (let i = 0; i < 4; i++) {
                const x = left + i * (cardW + gap), panel = UiSurfaces.panel(place(new Element(), x, cardY, cardW, 32));
                r.addChild(panel);
                cards.push({ name: label(panel, "", 5, 4, cardW - 14), status: label(panel, "", 5, 17, cardW - 14, 0xff444444), barWidth: cardW - 14 });
                const bar = surface(place(new Element(), 5, 29, cardW - 14, 2), 0xff78a077, 0); panel.addChild(bar); bars.push(bar);
            }
            hint = label(r, "", left, cardY + 38, total, 0xfff0e5c9);
            hud = UiSurfaces.hud(config.id + ":companion", r);
        }
        function showSettings(): void {
            modal = "settings"; picking.cancel();
            const skills = details && details.skills ? details.skills.slice() : [];
            if (details && details.requested && details.requested.id === requestedMove && !skills.some((s: any) => s.id === details.requested.id)) skills.push(details.requested);
            if (requestedMove) skills.forEach((skill: any, index: number) => { if (skill.id === requestedMove) settingMove = index; });
            settingMove = Math.max(0, Math.min(settingMove, skills.length - 1));
            const selected = requestedMove || skills[settingMove] && skills[settingMove].id || "";
            const current = skills.filter((skill: any) => skill.id === selected)[0];
            if (current && current.detailsComplete === false) { requestedMove = selected; inspect(); }
            const tabs = skills.map((skill: any) => {
                return { id: skill.id, name: skill.nameKey ? {key:skill.nameKey} : skill.name, description: skill.description,
                    fields: skill.fields || [], values: skill.values, revision: skill.revision, summary: skill.summary, numbers: skill.numbers };

            });
            const missing = selected && !tabs.some((tab: any) => tab.id === selected);
            const message = !details ? tr("loading_skills") : !skills.length && !selected ? tr("no_skills") : missing ? requestedLoaded === selected ? tr("no_action") : tr("loading_selected") : tr("no_preferences");
            editor.notice(noticeUntil > ticks ? notice : "");
            editor.present({ identity: state.pokemon, title: tr("skill_title",state.name || tr("companion")), tabs, selected, message,
                returnLabel: state.inspection ? tr("return_moves") : "", footer: tr("reset_hint") });
        }
        function showAttributes(fetch = true): void {
            modal = "attributes"; picking.cancel();
            attributes.present(state.pokemon, state.name || tr("companion"), attributeRows, attributeNature, () => inspect());
            if (fetch) inspect();
        }
        function showRadial(reset = true, clickToChoose = false): void {
            if (!canCommand()) return;
            if (invalidated || !details) inspect();
            modal = "radial"; picking.cancel(); radial.updateItems(details && details.menu || []); radial.open(reset,clickToChoose);
        }
        function clearTarget(): void { Bridge.indicator(""); config.world.target(null); config.effects?.cancelTarget?.(); }
        function close(): void { Host.close(); modal = ""; editor.invalidate(); attributes.invalidate(); requestedMove = ""; requestedLoaded = ""; }
        function submit(command: any, aim: any): void {
            if (config.executeCommand && config.executeCommand(command, aim, Bridge)) { announce(tr("requested", command.label)); return; }
            if (command.command === "cast") Bridge.cast(command.slot, JSON.stringify(aim));
            else Bridge.command(command.command, JSON.stringify(aim));
            announce(tr("requested", command.label));
        }
        function chooseCommand(command: any): void {
            close();
            if (command.command === "attributes") { showAttributes(); return; }
            if (command.command === "preferences") { requestedMove = command.move || ""; inspect(); showSettings(); return; }
            if (!command.command) return;
            const resolve = config.targetResolvers && config.targetResolvers[command.target];
            if (resolve) { submit(command, resolve(state, command, Bridge)); return; }
            if (command.target === "none" || command.target === "self" || command.target === "owner") {
                submit(command, JSON.parse(Bridge.aim(command.target === "owner" ? "player" : command.target === "self" ? "self" : "look"))); return;
            }
            picking.begin(command); announce(tr("target_hint", command.detail, state.confirmKey, state.backKey));
        }
        function input(raw: string): boolean {
            const event = JSON.parse(raw);
            if (event.key === "invalidate") {
                if (event.channel === config.channel && event.pokemon === state.pokemon && Number(event.revision) > notificationRevision) {
                    notificationRevision = Number(event.revision); invalidated = true;
                }
                return false;
            }
            if (event.key === "command-click" && event.pressed) { if (!canCommand()) return false; showRadial(true,true); return true; }
            if (event.key === "command") {
                if (event.pressed) { if (!canCommand()) return false; if(modal === "radial") close(); else showRadial(); return true; }
                if (modal === "radial") { radial.release(event.heldMillis === undefined || event.heldMillis >= 180); return true; }
                return false;
            }
            if (!event.pressed) return false;
            if (event.key === "attributes" && state.pokemon) { showAttributes(); return true; }
            if (event.key === "settings" && state.pokemon) {
                const remembered = details && details.skills && details.skills[settingMove];
                requestedMove = String(event.move || remembered && remembered.id || ""); requestedLoaded = ""; inspect(); showSettings(); return true;
            }
            if (modal === "radial" && event.key === "confirm") { radial.confirm(); return true; }
            if (modal === "radial" && event.key === "back") { radial.back(); return true; }
            if ((modal || pending) && (event.key === "cancel" || event.key === "back")) {
                const returnToMenu = !!pending && event.key === "back";
                close(); picking.cancel();
                if (returnToMenu) { showRadial(false); }
                return true;
            }
            if (pending && event.key === "confirm") return picking.confirm(selectionAim(pending));
            return false;
        }
        function update(raw: string): void {
            state = JSON.parse(raw); ticks++;
            if (state.feedbackSequence !== undefined && state.feedbackSequence !== feedbackSequence) {
                feedbackSequence = state.feedbackSequence;
                const key = String(state.feedbackReason || "").replace(/^worldcombat\.reason\./, "");
                if (key) announce(reasons[key] || config.world.explainReason(key));
            }
            if (modal && !Host.active()) modal = "";
            config.effects?.tick?.();
            const manifest = state.session + "/" + state.epoch;
            if (manifestIdentity !== manifest) {
                manifestIdentity = manifest; supportedMoves = Object.create(null);
                Object.keys(summaries).forEach(key => { delete summaries[key]; });
            }
            const identity = state.session + "/" + state.epoch + "/" + state.pokemon;
            if (identity !== lastIdentity) { lastIdentity = identity; attributeRows = null; attributeNature = null; details = null; inspectPending = null; inspectQueued = false; invalidated = true; notificationRevision = -1; hud = null; revisions.finish(); close(); picking.cancel(); }
            const loadout = JSON.stringify([identity, state.nativeMoves || (state.skills || []).map((skill: any) => skill.id)]);
            const loadoutChanged = loadoutIdentity !== loadout; loadoutIdentity = loadout;
            if (pending && state.screen && !state.uiActive) { picking.cancel(); announce(tr("target_cancelled")); }
            // Summary dispatch supplies its selected move immediately after this identity update.
            if ((invalidated && (modal || pending || !details && !state.inspection)) || loadoutChanged && !state.inspection) inspect();
            if (!hasAbilities()) { Host.hud(config.id + ":companion", null); hud = null; }
            else {
                const size = Host.width() + "/" + Host.height();
                if (!hud || viewport !== size) { viewport = size; buildHud(); }
                const prepared = config.hudExtra ? config.hudExtra(details) : "";
                title.setText(text((state.name || tr("companion")) + "  ·  " + plain(intents[state.intent] || state.intent || tr("follow")) + "  ·  " +
                    (state.entityId < 0 ? tr("recalled") : plain(phases[state.stage] || state.stage || tr("ready"))) + prepared));
                (state.skills || []).forEach((skill: any, i: number) => {
                    if (i > 3) return;
                    if (!skill.id && details && details.skills) details.skills.forEach((known: any) => {
                        if (known.slot === i) skill = { id: known.id, label: known.name, cooldown: 0, remaining: known.pp, maximum: known.maxPp };
                    });
                    const binding=(state.castKeys || state.keys || [])[i] || "";
                    cards[i].name.setText(text("[" + binding + "] " + localName(skill)));
                    UiSurfaces.tooltip(cards[i].name,[localName(skill)]);
                    cards[i].status.setText(text(skill.cooldown > 0 ? tr("cooldown",Math.ceil(skill.cooldown / 20)) : tr("pp",skill.remaining,skill.maximum)));
                    bars[i].lss("width", Math.max(0, Math.min(cards[i].barWidth, (skill.maximum ? skill.remaining / skill.maximum : 0) * cards[i].barWidth)));
                });
            }
            const reasonKey = String(state.hint || "").replace(/^worldcombat\.reason\./, "");
            const reason = plain(reasons[reasonKey] || reasons[reasonKey.replace(config.actionPrefix, "")] || config.world.explainReason(reasonKey));
            config.world.select(state, details, reason);
            let message = reason || (noticeUntil > ticks ? notice : config.effects?.status?.(state.actor) || tr("controls",state.commandKey,state.settingsKey,state.precisionKey));
            if (!pending && state.input && state.input.mode) {
                const selected=(state.skills||[])[state.input.slot];
                message=state.input.mode === "sustained" ? tr("channel_hint",selected?localName(selected):"",state.cancelKey,state.backKey)
                    : tr("selection_step",state.input.step,state.input.total,state.confirmKey,state.backKey);
            } else if (!pending && state.precisionHeld) {
                const selected=(state.skills||[])[state.previewSlot];
                message=selected?tr("precision_preview",localName(selected),state.precisionKey,state.cancelKey):tr("precision_choose",(state.keys||[]).join(" / "),state.precisionKey,state.cancelKey);
            }
            if (pending) {
                const aim = selectionAim(pending);
                message = tr("target_hint",pending.label,state.confirmKey,state.backKey);
                if (noticeUntil > ticks && notice !== tr("target_hint",pending.detail,state.confirmKey,state.backKey)) message = notice;
                if (pending.target === "block" && (!aim || aim.reason)) { clearTarget(); message=tr("choose_block"); }
                else if (aim) {
                    config.world.target({ aim, targetMode: pending.target, label: plain(pending.label), confirm: state.confirmKey, back: state.backKey });
                    const skill = pending.move ? skillDetail(pending.move) : null;
                    const design = skill && skill.indicator || {};
                    const data: any = { style: "target", phase: "active", radius: .35, preview: true, label: plain(pending.label) };
                    Object.keys(design).forEach(key => { data[key] = design[key]; });
                    if(pending.target === "block") data.geometry = "block";
                    const sourceAim = JSON.parse(Bridge.aim("self"));
                    const from = sourceAim && sourceAim.point;
                    if (!data.direction && from) data.direction = [aim.point.x - from.x, aim.point.y - from.y, aim.point.z - from.z];
                    const at = pending.target !== "block" && from && (skill && skill.kind === "self" || data.geometry === "line" || data.geometry === "cone") ? from : aim.point;
                    Bridge.indicator(JSON.stringify({ key: config.id + ":command", type: config.selectionScene, version: 1, position: [at.x, at.y, at.z], data: data }));
                }
            }
            if (hud && hint) hint.setText(text(message));
            const currentLanguage=UiSurfaces.locale();
            if(language!==currentLanguage){language=currentLanguage;if(modal==="settings")showSettings();else if(modal==="attributes")showAttributes(false);else if(modal==="radial")radial.open(false);else if(modal==="layout")radial.refreshLocale();}
            if (modal === "radial") radial.refresh();
            if (modal === "settings" && noticeUntil === ticks) editor.notice("");
            if (modal === "attributes" && noticeUntil === ticks) attributes.notice("");
        }

        function reply(raw: string): void {
            const envelope = JSON.parse(raw);
            if (envelope.channel !== config.channel || envelope.pokemon !== state.pokemon) return;
            const wasWriting = revisions.finish();
            const reload = inspectQueued || invalidated;
            inspectPending = null; inspectQueued = false; invalidated = false;
            const data = JSON.parse(envelope.data || "{}");
            if (envelope.code !== "ok" || data.error) {
                inspectPending = null; invalidated = reload;
                const code = data.error || envelope.code;
                const messages: any = { "settings-changed": tr("settings_changed"), "data-changed": tr("settings_changed"),
                    "invalid-preference": tr("invalid_preference"), "move-unavailable": tr("move_unavailable"), "not-owned-party": tr("not_owned") };
                announce(messages[code] || tr("save_failed"));
                if (modal === "settings") showSettings();
                if (data.error === "settings-changed" || envelope.code === "data-changed") inspect();
                return;
            }
            if (data.attributes) {
                attributeRows = data.attributes; attributeNature = data.nature;
                if (modal === "attributes") showAttributes(false);
                if (reload && modal) { invalidated = true; inspect(); }
                return;
            }
            if (wasWriting) announce(tr("saved"));
            if (data.supportedMoves) { supportedMoves = Object.create(null); data.supportedMoves.forEach((id: string) => { supportedMoves[String(id)] = true; }); }
            if (data.skills) {
                details = data;
                const complete = data.skills.concat(data.requested ? [data.requested] : []).filter((skill: any) => skill.detailsComplete === true);
                if (!complete.length || complete.some((skill: any) => skill.id === requestedMove)) requestedLoaded = requestedMove;
                summaries[envelope.pokemon] = data;
            }
            else { inspect(); return; }
            if (modal === "settings") showSettings();
            radial.updateItems(data.menu || []);
            if(pending){
                const current=(data.menu||[]).filter((item:any)=>item.id===pending.id)[0];
                if(!current||current.disabled){picking.cancel();announce(current?.disabled||tr("command_changed"));}
                else picking.begin(current);
            }
            if (reload && inspectPending === null) { invalidated=true;if(modal||pending)inspect(); }
        }
        function summaryDraw(region: any): void {
            // Minecraft and NeoForge expose int/float text overloads; select the text representation explicitly for Rhino.
            const drawPlain = "drawString(net.minecraft.client.gui.Font,java.lang.String,int,int,int,boolean)";
            const drawComponent = "drawString(net.minecraft.client.gui.Font,net.minecraft.network.chat.Component,int,int,int,boolean)";
            const drawFormatted = "drawString(net.minecraft.client.gui.Font,net.minecraft.util.FormattedCharSequence,int,int,int,boolean)";
            const g = region.graphics(), x = region.x(), y = region.y(), w = region.width(), h = region.height();
            const hovered = region.mouseX() >= x && region.mouseX() < x + w && region.mouseY() >= y && region.mouseY() < y + h;
            const compact = region.kind() === "learnset";
            g.fill(x, y, x + w, y + h, (hovered && !compact ? 0xffded7bd : 0xffc6c6c6) | 0);
            const font = Minecraft.getInstance().font, scale = compact ? .5 : .68;
            g.pose().pushPose(); g.pose().translate(x + (compact ? 1 : 4), y + (compact ? 1 : 3), 0); g.pose().scale(scale, scale, 1);
            const width = Math.floor((w - (compact ? 2 : 8)) / scale);
            const known = summaries[String(region.pokemon())];
            let skill: any = null;
            if (known && known.skills) known.skills.forEach((s: any) => { if (s.id === String(region.move())) skill = s; });
            if (known && known.requested && known.requested.id === String(region.move())) skill = known.requested;
            try {
                if (compact) {
                    g[drawComponent](font, text(tr("details_hint",state.settingsKey || "")), 0, 0, 0xff333333 | 0, false);
                } else {
                    g[drawPlain](font, font.plainSubstrByWidth(skill ? tr("summary_heading",skill.nameKey?{key:skill.nameKey}:skill.name,region.pp(),region.maxPp()) : tr("skill_details"), width), 0, 0, 0xff222222 | 0, false);
                    const lines = font.split(text(skill ? plain(skill.brief || skill.description) : tr("choose_skill_details")), width);
                    for (let i = 0; i < Math.min(2, lines.size()); i++) g[drawFormatted](font, lines.get(i), 0, 12 + i * 10, 0xff444444 | 0, false);
                    g[drawComponent](font, text(tr("open_details")), 0, 40, 0xff555555 | 0, false);
                }
            } finally { g.pose().popPose(); }
        }
        Summary.listen((raw: string) => {
            const facts = JSON.parse(raw), known = summaries[String(facts.pokemon)];
            return !!((facts.moves || []).some((id: string) => supportedMoves[String(id)]) ||
                known && (known.skills && known.skills.length || known.requested));
        }, summaryDraw, (region: any) => (region.button() === 0 || region.button() === -1) && Bridge.dispatch("settings", String(region.pokemon()), String(region.move())));
        Bridge.listen(input, update, reply);
        WorldCombatClient.cleanup(config.id + ":interface", () => { Host.reset(); modal = ""; pending = null; clearTarget(); Bridge.listen(null, null, null); Summary.listen(null, null, null); });
        const targetEffect = config.effects && config.effects.target;
        if (targetEffect) WorldCombatClient.scene(config.selectionScene, 1, frame => targetEffect.call(config.effects, frame));
    }
}
