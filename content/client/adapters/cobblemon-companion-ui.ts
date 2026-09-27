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
    /** Logical GUI coordinates; reserve the native party rail, crosshair and bottom hotbar/status area. */
    export function hudLayout(width: number, height: number, recalled = false): any {
        const narrow = width < 480 || height < 280, gap = 4;
        const columns = narrow ? 2 : 4;
        const available = narrow ? Math.max(92, Math.floor(width / 2) - 22) : Math.max(180, width - 176);
        const cardWidth = Math.min(88, Math.floor((available - gap * (columns - 1)) / columns));
        const total = recalled ? Math.min(256, available) : cardWidth * columns + gap * (columns - 1);
        const left = narrow ? width - total - 8 : Math.floor((width - total) / 2);
        const cardHeight = 32, rows = recalled ? 0 : 4 / columns;
        const cardsHeight = rows ? rows * cardHeight + (rows - 1) * gap : 0;
        const hintHeight = narrow ? 24 : 12;
        const top = height - 62 - hintHeight - cardsHeight - 16;
        return { left, top: Math.max(5, top), width: total, columns, cardWidth, cardHeight, gap, cardsHeight, hintHeight, narrow, recalled };
    }
    /** Empty slots and unlimited resources are separate states, so native -1 sentinels never become player text. */
    export function hudSlot(skill: any): any {
        const occupied = !!(skill && skill.id), cooldown = occupied ? Math.max(0, Number(skill.cooldown) || 0) : 0;
        const maximum = occupied && typeof skill.maximum === "number" && skill.maximum > 0 ? skill.maximum : null;
        const remaining = maximum !== null && typeof skill.remaining === "number" && skill.remaining >= 0 ? Math.min(maximum, skill.remaining) : null;
        return { occupied, cooldown, maximum, remaining, ratio: maximum !== null && remaining !== null ? remaining / maximum : 0,
            exhausted: remaining === 0, unavailable: occupied && skill.available === false && !cooldown };
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
        let hud: any = null, title: any, phaseLabel: any, hint: any, cards: any[] = [], hudBox: any = null;
        let viewport = "", modal = "", pending: any = null, loadoutIdentity = "", availabilityIdentity = "", language = "";
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
        const radial = new RadialMenu.View({ id:config.id + ":commands", legacyIds:(config.legacyIds||[]).map(id=>id+":commands"), customize:()=>{modal="layout";}, customized:()=>{modal="radial";}, title: () => tr("command_title",state.name || tr("companion")), backLabel: () => state.backKey, confirmLabel: () => state.confirmKey, commandLabel: () => state.commandKey,
            choose: item => chooseCommand(item), close: () => close(), reject: reason => announce(reason), base: config.menuBase, highlight: config.menuHighlight, accent: config.accent,
            renderItem: config.menuRenderer });
        const picking = new UiState.Selection<any, any>({
            validate: (item, aim) => item.target === "block" && (!aim || aim.reason) ? tr("choose_block") : config.validateSelection ? config.validateSelection(item, aim) : item.target === "entity" && (!aim || aim.target === "00000000-0000-0000-0000-000000000000") ? tr("choose_target") : "",
            submit: (item, aim) => submit(item, aim), continuous: item => !!item.continuous,
            changed: item => { pending = item; if (!item) clearTarget(); }, reject: reason => announce(reason)
        });
        function selectionAim(item: any): any {
            return JSON.parse(item.target === "block" ? Bridge.blockAim()
                : item.command === "cast" ? Bridge.skillAim(item.slot) : Bridge.look());
        }
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
        const palette = UiSurfaces.palette, labelCache: any[] = [];
        function setLabel(widget: any, value: string, color?: number): void {
            let cached = labelCache.filter(entry => entry.widget === widget)[0];
            if (!cached) { cached = { widget }; labelCache.push(cached); }
            if (cached.text !== value) { widget.setText(text(value)); cached.text = value; }
            if (color !== undefined && cached.color !== color) { widget.getTextStyle().textColor(color | 0); cached.color = color; }
        }
        function fit(value: string, width: number): string { return UiSurfaces.fit(value, Math.max(1, width)); }
        function bindingLabel(value: string, width: number): string {
            if (UiSurfaces.measure(value) <= width) return value;
            const at = value.lastIndexOf("+");
            if (at < 0) return fit(value, width);
            const key = value.slice(at);
            return fit(value.slice(0, at), width - UiSurfaces.measure(key)) + key;
        }
        function buildHud(recalled: boolean): void {
            labelCache.length = 0; const r = root(); hudBox = hudLayout(Host.width(), Host.height(), recalled);
            const box = hudBox, header = surface(place(new Element(), box.left, box.top, box.width, 14), palette.panel, 0);
            r.addChild(header);
            title = label(header, "", 5, 1, box.width - 10, palette.text);
            phaseLabel = label(header, "", 5, 1, box.width - 10, palette.muted);
            UiSurfaces.align(phaseLabel, "right");
            cards = [];
            if (!recalled) for (let i = 0; i < 4; i++) {
                const x = box.left + (i % box.columns) * (box.cardWidth + box.gap), y = box.top + 16 + Math.floor(i / box.columns) * (box.cardHeight + box.gap);
                const panel = surface(place(new Element(), x, y, box.cardWidth, box.cardHeight), palette.panel, 0); r.addChild(panel);
                const edge = surface(place(new Element(), 0, 0, box.cardWidth, 1), palette.border, 0); panel.addChild(edge);
                const badge = surface(place(new Element(), 4, 15, 16, 12), palette.raised, 0); panel.addChild(badge);
                const binding = label(badge, "", 2, 0, 12, palette.muted);
                const name = label(panel, "", 4, 1, box.cardWidth - 8, palette.text);
                const status = label(panel, "", 24, 14, box.cardWidth - 28, palette.muted); UiSurfaces.align(status, "right");
                const cooldown = label(panel, "", 4, 1, box.cardWidth - 8, palette.warning); UiSurfaces.align(cooldown, "right");
                const track = surface(place(new Element(), 4, 29, box.cardWidth - 8, 1), palette.border, 0); panel.addChild(track);
                const bar = surface(place(new Element(), 4, 29, 0, 1), palette.accent, 0); panel.addChild(bar);
                cards.push({ panel, edge, badge, binding, name, status, cooldown, track, bar, width: box.cardWidth, barWidth: box.cardWidth - 8, look: "" });
            }
            const hintY = box.top + 16 + box.cardsHeight + (box.cardsHeight ? 3 : 0);
            hint = label(r, "", box.left + 4, hintY, box.width - 8, palette.muted);
            hint.lss("height", box.hintHeight); UiSurfaces.wrap(hint);
            hud = UiSurfaces.hud(config.id + ":companion", r);
        }
        function showHud(): void {
            const recalled = state.entityId < 0, compact = recalled || !(state.skills || []).some((skill: any) => !!skill.id);
            const size = Host.width() + "/" + Host.height() + "/" + compact;
            if (!hud || viewport !== size) { viewport = size; buildHud(compact); }
            const box = hudBox;
            const queued = ["queued", "waiting-cooldown", "waiting-action", "approaching"].indexOf(state.reason) >= 0;
            const phase = recalled ? tr("recalled") : queued ? tr("hud." + state.reason) : plain(phases[state.stage] || phases.idle || tr("ready"));
            const identity = (state.name || tr("companion")) + (recalled ? "" : " · " + plain(intents[state.intent] || tr("follow")));
            const phaseWidth = Math.min(Math.floor(box.width * .46), UiSurfaces.measure(phase));
            setLabel(title, fit(identity, box.width - phaseWidth - 18), palette.text);
            setLabel(phaseLabel, fit(phase, phaseWidth), queued ? palette.warning : palette.muted);
            if (compact) return;
            for (let i = 0; i < 4; i++) {
                const skill = (state.skills || [])[i] || {}, facts = hudSlot(skill), card = cards[i];
                const chosen = state.input && state.input.mode ? state.input.slot === i : state.precisionHeld && state.previewSlot === i;
                const binding = String((state.castKeys || state.keys || [])[i] || "");
                const keyWidth = Math.min(card.width - 24, Math.max(16, UiSurfaces.measure(binding) + 5));
                if (card.keyWidth !== keyWidth) {
                    card.keyWidth = keyWidth;
                    card.badge.lss("width", keyWidth); card.binding.lss("width", keyWidth - 4);
                    card.status.lss("left", keyWidth + 8).lss("width", card.width - keyWidth - 12);
                }
                setLabel(card.binding, bindingLabel(binding, keyWidth - 4), chosen ? palette.accent : palette.muted);
                const seconds = facts.cooldown ? tr("hud.seconds", facts.cooldown < 60 ? (Math.ceil(facts.cooldown / 2) / 10).toFixed(1) : Math.ceil(facts.cooldown / 20)) : "";
                const secondsWidth = seconds ? UiSurfaces.measure(seconds) + 5 : 0;
                const name = facts.occupied ? localName(skill) : tr("empty_slot");
                setLabel(card.name, fit(name, card.width - 8 - secondsWidth), facts.occupied && !facts.unavailable ? palette.text : palette.muted);
                setLabel(card.cooldown, seconds, palette.warning);
                let resource = facts.remaining !== null ? facts.remaining + "/" + facts.maximum : facts.occupied ? (facts.unavailable ? tr("hud.unavailable") : "—") : "";
                if (facts.remaining !== null && UiSurfaces.measure(resource) > card.width - keyWidth - 12) resource = String(facts.remaining);
                setLabel(card.status, fit(resource, card.width - keyWidth - 12), facts.exhausted ? palette.danger : palette.muted);
                const look = String(chosen) + "/" + facts.occupied + "/" + facts.exhausted + "/" + facts.unavailable;
                if (card.look !== look) {
                    card.look = look; surface(card.panel, chosen ? palette.raised : palette.panel, 0);
                    surface(card.edge, chosen ? palette.accent : facts.exhausted ? palette.danger : facts.unavailable ? palette.warning : palette.border, 0);
                }
                const width = Math.floor(card.barWidth * facts.ratio);
                if (card.lastBar !== width) { card.bar.lss("width", width); card.lastBar = width; }
            }
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
            if (!command.command) {
                const aim = selectionAim(command);
                if (config.executeCommand && config.executeCommand(command, aim, Bridge)) { close(); announce(tr("requested", command.label)); }
                else { announce(tr("hud.no_command")); showRadial(false, true); }
                return;
            }
            close();
            if (command.command === "attributes") { showAttributes(); return; }
            if (command.command === "preferences") { requestedMove = command.move || ""; inspect(); showSettings(); return; }
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
            // Live server bindings report ground/riding/resource eligibility without changing the loadout.
            // Reuse the existing invalidation/coalescing path so an open menu follows that transition.
            const availability = JSON.stringify([identity, (state.skills || []).map((skill: any) => [skill.id, skill.available, skill.reason])]);
            if (availabilityIdentity !== availability) { availabilityIdentity = availability; invalidated = true; }
            if (pending && state.screen && !state.uiActive) { picking.cancel(); announce(tr("target_cancelled")); }
            // Summary dispatch supplies its selected move immediately after this identity update.
            if ((invalidated && (modal || pending || !details && !state.inspection)) || loadoutChanged && !state.inspection) inspect();
            if (!hasAbilities() || state.inspection || !state.pokemon) { Host.hud(config.id + ":companion", null); hud = null; }
            else showHud();
            const reasonKey = String(state.hint || "").replace(/^worldcombat\.reason\./, "");
            const reason = plain(reasons[reasonKey] || reasons[reasonKey.replace(config.actionPrefix, "")] || config.world.explainReason(reasonKey));
            config.world.select(state, details, reason);
            let message = reason || (noticeUntil > ticks ? notice : config.effects?.status?.(state.actor) || tr("hud.controls",state.commandKey,state.settingsKey));
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
            if (hud && hint) {
                const extra = config.hudExtra ? config.hudExtra(details) : "";
                const quiet = !pending && !(state.input && state.input.mode) && !state.precisionHeld && !reason && noticeUntil <= ticks;
                if (quiet && extra) message = extra + " · " + message;
                const lines = UiSurfaces.lines(message, Math.max(1, hudBox.width - 8));
                const maxLines = hudBox.narrow ? 2 : 1;
                const visible = lines.slice(0, maxLines);
                if (lines.length > maxLines) visible[maxLines - 1] = fit(visible[maxLines - 1] + "…", hudBox.width - 8);
                setLabel(hint, visible.join("\n"), quiet ? palette.muted : palette.warning);
            }
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
