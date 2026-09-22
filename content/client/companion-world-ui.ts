/** PokemonSkills's world vocabulary and authored states, using shared world UI composition. */
namespace CompanionWorldUi {
    export const selectionContributions = new WorldContributions.Registry<{ state: any; details: any; extra: any }>();
    export const cardContributions = new WorldContributions.Registry<{ actor: string; value: any; anchor: any; rows: any[] }>();
    export function reason(id: string, translation: string): void { reasons[id] = translation; }
    export function intent(id: string, translation: string): void { intents[id] = translation; }
    export function phase(id: string, translation: string): void { phases[id] = translation; }

    const intents: any = { follow: "feedback.world_combat.ui.follow", autonomous: "feedback.world_combat.ui.roam", hold: "feedback.world_combat.ui.hold", stay: "feedback.world_combat.ui.stay", protect: "feedback.world_combat.ui.protect", work: { key: "worldcombat.ui.intents.work" }, focus: "feedback.world_combat.ui.focus", free: "feedback.world_combat.ui.roam" };
    const phases: any = { prepare: "feedback.world_combat.ui.prepare", preparing: "feedback.world_combat.ui.prepare", active: "feedback.world_combat.ui.cast", execute: "feedback.world_combat.ui.cast", running: "feedback.world_combat.ui.cast", recover: "feedback.world_combat.ui.recover", recovering: "feedback.world_combat.ui.recover",
        approaching: "feedback.world_combat.ui.approach", attending: "feedback.world_combat.ui.care", retreating: "feedback.world_combat.ui.retreat", blocked: "feedback.world_combat.ui.blocked", maintaining: "feedback.world_combat.ui.maintain", idle: "feedback.world_combat.ui.ready",
        searching: "feedback.world_combat.ui.search", checking: "feedback.world_combat.ui.check", waiting: "feedback.world_combat.ui.wait", observing: "feedback.world_combat.ui.observe" };
    const kinds: any = { damage: { label: "", color: 0xffffe4cf }, critical: { label: "feedback.world_combat.ui.critical", color: 0xffffd26e },
        heal: { label: "", color: 0xffb8f29f }, immune: { label: "feedback.world_combat.ui.immune", color: 0xffc6ced9 }, miss: { label: "feedback.world_combat.ui.miss", color: 0xffc6ced9 },
        guard: { label: "feedback.world_combat.ui.blocked_22", color: 0xffa8e5ed }, endure: { label: "feedback.world_combat.ui.endured", color: 0xffffd26e }, work: { label: "feedback.world_combat.ui.care", color: 0xffd1e8a3 },
        break: { label: "feedback.world_combat.ui.substitute_broken", color: 0xffffd18d }, "toxin-consumed": { label: "feedback.world_combat.ui.poison_consumed_detonation", color: 0xffe7a0fa },
        failed: { label: "feedback.world_combat.ui.could_not_cast", color: 0xffffc791 } };
    const reasons: any = { "already-carried": "worldcombat.reason.already-carried", "already-swapped": "worldcombat.reason.already-swapped", "needs-sunlight": "feedback.world_combat.ui.needs_natural_sunlight", "sunlight-lost": "feedback.world_combat.ui.sunlight_interrupted", "light-full": "feedback.world_combat.ui.light_reserve_full",
        "work-unavailable": "worldcombat.ui.reasons.work-unavailable", "work-interrupted": "worldcombat.ui.reasons.work-interrupted",
        "work-target-changed": "worldcombat.ui.reasons.work-target-changed", "work-unreachable": "worldcombat.ui.reasons.work-unreachable", "work-running": "worldcombat.ui.reasons.work-running",
        "target-left": "feedback.world_combat.ui.target_left", "out-of-range": "feedback.world_combat.ui.out_of_range", "invalid-target": "feedback.world_combat.ui.invalid_target", "target-not-visible": "feedback.world_combat.ui.line_of_sight_blocked",
        "path-blocked": "feedback.world_combat.ui.path_blocked", "capture-in-progress": "feedback.world_combat.ui.waiting_for_capture", "no-usable-skill": "feedback.world_combat.ui.no_usable_move",
        "skill-unavailable": "feedback.world_combat.ui.waiting_for_conditions", "control-preserved": "feedback.world_combat.ui.preserving_control", care: "feedback.world_combat.ui.caring_for_a_companion", prepare: "feedback.world_combat.ui.prepare",
        warning: "feedback.world_combat.ui.warning_a_threat", control: "feedback.world_combat.ui.controlling_the_target", attack: "feedback.world_combat.ui.working_together", attending: "feedback.world_combat.ui.caring_for_this_area", retreating: "feedback.world_combat.ui.leaving_danger", free: "feedback.world_combat.ui.roam", autonomous: "feedback.world_combat.ui.roaming_nearby", hold: "feedback.world_combat.ui.awaiting_your_command", returning: "feedback.world_combat.ui.returning_to_you",
        curious: "feedback.world_combat.ui.investigating", "seeking-light": "feedback.world_combat.ui.seeking_sunlight", cultivate: "feedback.world_combat.ui.tending_plants", "work-found": "feedback.world_combat.ui.found_work", "work-completed": "feedback.world_combat.ui.care_complete",
        "work-complete": "feedback.world_combat.ui.care_complete", "work-checking": "feedback.world_combat.ui.inspecting_the_site", "work-no-change": "feedback.world_combat.ui.no_care_needed_here", "work-resting": "feedback.world_combat.ui.waiting_for_changes",
        "cultivation-reserve": "feedback.world_combat.ui.reserving_pp", "cultivation-unavailable": "feedback.world_combat.ui.cannot_tend_this_site", "poison-setup": "feedback.world_combat.ui.preparing_poison_synergy",
        survive: "feedback.world_combat.ui.surviving_danger", shield: "feedback.world_combat.ui.shielding_a_companion", cover: "feedback.world_combat.ui.creating_cover", bolster: "feedback.world_combat.ui.helping_a_companion", "travel-help": "feedback.world_combat.ui.helping_travel", fortify: "feedback.world_combat.ui.regrouping", drain: "feedback.world_combat.ui.draining_for_support",
        "choose-friend": "feedback.world_combat.ui.choose_a_friendly_target", "choose-enemy": "feedback.world_combat.ui.choose_an_enemy", "no-pp": "feedback.world_combat.ui.no_pp_remaining", cooldown: "feedback.world_combat.ui.move_is_cooling_down",
        busy: "feedback.world_combat.ui.finishing_the_current_action", "already-protected": "feedback.world_combat.ui.protection_is_still_active", "insufficient-health": "feedback.world_combat.ui.not_enough_health_for_a_substitute",
        "already-supported": "feedback.world_combat.ui.support_is_still_active", "no-healing-needed": "feedback.world_combat.ui.no_healing_needed", "already-rooted": "feedback.world_combat.ui.already_rooted",
        "not-grounded": "feedback.world_combat.ui.needs_solid_ground", "mounted-control": "feedback.world_combat.ui.unavailable_while_mounted", "no-companion": "feedback.world_combat.ui.send_out_a_companion_first" };
    export function explainReason(raw: string): string {
        const key = String(raw || "").replace(/^worldcombat\.reason\./, "").replace(/^world_combat:/, "");
        return reasons[key] ? UiSurfaces.t(reasons[key]) : (/[\u3400-\u9fff\s]/.test(key) ? key : "");
    }
    const legacyLabels: any = {"同行": "feedback.world_combat.ui.follow", "自主活动": "feedback.world_combat.ui.roam", "待命": "feedback.world_combat.ui.hold", "驻守": "feedback.world_combat.ui.stay", "护卫": "feedback.world_combat.ui.protect", "照料": "feedback.world_combat.ui.care", "协同压制": "feedback.world_combat.ui.focus", "准备": "feedback.world_combat.ui.prepare", "施放": "feedback.world_combat.ui.cast", "恢复": "feedback.world_combat.ui.recover", "接近": "feedback.world_combat.ui.approach", "避险": "feedback.world_combat.ui.retreat", "受阻": "feedback.world_combat.ui.blocked", "维持": "feedback.world_combat.ui.maintain", "就绪": "feedback.world_combat.ui.ready", "寻找": "feedback.world_combat.ui.search", "检查": "feedback.world_combat.ui.check", "等待": "feedback.world_combat.ui.wait", "观察": "feedback.world_combat.ui.observe", "暴击": "feedback.world_combat.ui.critical", "免疫": "feedback.world_combat.ui.immune", "未命中": "feedback.world_combat.ui.miss", "抵挡": "feedback.world_combat.ui.blocked_22", "保命": "feedback.world_combat.ui.endured", "替身破碎": "feedback.world_combat.ui.substitute_broken", "中毒已消耗 · 毒性引爆": "feedback.world_combat.ui.poison_consumed_detonation", "未能施放": "feedback.world_combat.ui.could_not_cast", "需要自然日光": "feedback.world_combat.ui.needs_natural_sunlight", "光照中断": "feedback.world_combat.ui.sunlight_interrupted", "储光已满": "feedback.world_combat.ui.light_reserve_full", "目标已离开": "feedback.world_combat.ui.target_left", "超出范围": "feedback.world_combat.ui.out_of_range", "目标不适合": "feedback.world_combat.ui.invalid_target", "视线受阻": "feedback.world_combat.ui.line_of_sight_blocked", "路径受阻": "feedback.world_combat.ui.path_blocked", "等待捕捉结束": "feedback.world_combat.ui.waiting_for_capture", "当前无可用招式": "feedback.world_combat.ui.no_usable_move", "等待施放条件": "feedback.world_combat.ui.waiting_for_conditions", "维持已有控制": "feedback.world_combat.ui.preserving_control", "照料伙伴": "feedback.world_combat.ui.caring_for_a_companion", "准备光能": "feedback.world_combat.ui.gathering_light", "向威胁示警": "feedback.world_combat.ui.warning_a_threat", "限制对手": "feedback.world_combat.ui.controlling_the_target", "协同应对": "feedback.world_combat.ui.working_together", "照料此处": "feedback.world_combat.ui.caring_for_this_area", "脱离危险": "feedback.world_combat.ui.leaving_danger", "在附近自主活动": "feedback.world_combat.ui.roaming_nearby", "等待你的指示": "feedback.world_combat.ui.awaiting_your_command", "回到你身边": "feedback.world_combat.ui.returning_to_you", "留意新事物": "feedback.world_combat.ui.investigating", "寻找日光": "feedback.world_combat.ui.seeking_sunlight", "照料植物": "feedback.world_combat.ui.tending_plants", "找到照料目标": "feedback.world_combat.ui.found_work", "照料完成": "feedback.world_combat.ui.care_complete", "检查现场": "feedback.world_combat.ui.inspecting_the_site", "这里暂不需要照料": "feedback.world_combat.ui.no_care_needed_here", "等待现场变化": "feedback.world_combat.ui.waiting_for_changes", "保留技能次数": "feedback.world_combat.ui.reserving_pp", "暂无照料条件": "feedback.world_combat.ui.cannot_tend_this_site", "准备毒性配合": "feedback.world_combat.ui.preparing_poison_synergy", "争取保命机会": "feedback.world_combat.ui.surviving_danger", "保护受压伙伴": "feedback.world_combat.ui.shielding_a_companion", "布置掩护": "feedback.world_combat.ui.creating_cover", "协助伙伴": "feedback.world_combat.ui.helping_a_companion", "协助同行": "feedback.world_combat.ui.helping_travel", "重新整备": "feedback.world_combat.ui.regrouping", "汲取支援": "feedback.world_combat.ui.draining_for_support", "请选择友方伙伴": "feedback.world_combat.ui.choose_a_friendly_target", "请选择敌方目标": "feedback.world_combat.ui.choose_an_enemy", "本招 PP 已耗尽": "feedback.world_combat.ui.no_pp_remaining", "本招仍在冷却": "feedback.world_combat.ui.move_is_cooling_down", "正在完成当前行动": "feedback.world_combat.ui.finishing_the_current_action", "防护仍在持续": "feedback.world_combat.ui.protection_is_still_active", "生命不足以形成替身": "feedback.world_combat.ui.not_enough_health_for_a_substitute", "支援效果仍在持续": "feedback.world_combat.ui.support_is_still_active", "当前无需恢复": "feedback.world_combat.ui.no_healing_needed", "已经扎根": "feedback.world_combat.ui.already_rooted", "需要站在地面": "feedback.world_combat.ui.needs_solid_ground", "骑乘期间无法使用此招": "feedback.world_combat.ui.unavailable_while_mounted", "请先放出伙伴": "feedback.world_combat.ui.send_out_a_companion_first", "草编替身": "feedback.world_combat.ui.woven_substitute", "伙伴": "feedback.world_combat.ui.companion", " 次": "feedback.world_combat.ui.charges", " 防护": "feedback.world_combat.ui.protection", "剩余耐久 ": "feedback.world_combat.ui.durability", "储光": "feedback.world_combat.ui.stored_light", "防护": "feedback.world_combat.ui.protection_86", "不受粉末影响": "feedback.world_combat.result.unaffected_powder", "无法中毒": "feedback.world_combat.result.cannot_poison", "无法入睡": "feedback.world_combat.result.cannot_sleep", "新生": "feedback.world_combat.result.new_growth", "此处限制植物交互": "feedback.world_combat.result.plant_restricted", "生命投入未能完成": "feedback.world_combat.result.payment_failed", "汲取中断": "feedback.world_combat.result.drain_interrupted", "守住": "feedback.world_combat.result.protect", "挺住": "feedback.world_combat.result.endure", "催眠粉覆盖": "feedback.world_combat.result.sleep_area", "毒粉覆盖": "feedback.world_combat.result.poison_area", "示警范围": "feedback.world_combat.result.warning_area", "香气察觉范围": "feedback.world_combat.result.scent_area", "庭园照料范围": "feedback.world_combat.result.garden_area", "轻快同行": "feedback.world_combat.result.travel_help", "伙伴助力": "feedback.world_combat.result.combat_help", "恢复生命": "feedback.world_combat.result.restoring_life", "保持距离": "feedback.world_combat.result.keep_distance", "汲取联系": "feedback.world_combat.result.drain_link", "积蓄日光": "feedback.world_combat.result.store_sunlight", "植物生长": "feedback.world_combat.result.plant_growth"};
    export function translated(value: any): string {
        if (!value) return ""; if (typeof value === "object") return UiSurfaces.plain(value);
        const key = legacyLabels[String(value)] || String(value);
        return key.indexOf("feedback.") === 0 || key.indexOf("cobblemon.") === 0 ? UiSurfaces.t(key) : key;
    }
    const layer = new WorldSurfaces.Layer({ id: "world_combat:world-ui", project: project,
        reset: () => { if (selectionFeed) selectionFeed.reset(); if (results) results.clear(); } });
    const results = new WorldSurfaces.Results(() => layer.now());
    export function registerFeedback(kind: string, definition: any): void {
        if (kinds[kind]) throw new Error("Duplicate feedback kind " + kind); kinds[kind] = definition;
    }
    ["created", "protected", "reconnected", "disconnected", "expired", "toxin-base", "toxin-retained", "toxin-defeated"].forEach(kind => {
        registerFeedback(kind, { label: "", color: kind.indexOf("toxin-") === 0 ? 0xffde9fec : kind === "disconnected" ? 0xffffc28b : 0xffbceca8 });
    });
    const guards = layer.store<any>("guards"), failures = layer.store<any>("failures");
    const selectionFeed = new CobblemonWorldUi.SelectionFeed((actor, raw) => {
        const message = explainReason(raw); if (!message) return;
        failures.put(actor, { reason: message }, 42);
        layer.float("input/" + actor + "/" + layer.now(), { actor, start: layer.now(), duration: 42, text: message, color: kinds.failed.color, lane: 0 });
    });
    export function select(state: any, details: any, reason: string): void {
        layer.check(); const extra: any = { reason };
        selectionContributions.apply({ state, details, extra });
        const record = selectionFeed.update(state, extra);
        if (record) layer.card("selected", record, 30); else layer.removeCard("selected");
    }
    export function target(value: any): void { layer.overlay(CobblemonWorldUi.target(value)); }
    layer.source("protection", () => guards.values().slice(0, 8).map(guard => ({ actor: guard.actor, data: {} })));
    function project(actor: string, value: any, anchor: any): WorldSurfaces.Card {
        const phase = value.stage || "idle";
        const label = translated(value.label || ""), progress = value.progress;
        const failure = failures.get(actor), reason = failure ? failure.reason : explainReason(value.reason);
        const accent = failure || phase === "blocked" ? 0xffebb981 : phase === "prepare" || phase === "preparing" ? 0xffead583 : 0xffa6d9ab;
        const rows = CobblemonWorldUi.identityRows(anchor, value.name);
        rows.push({ kind: "columns", left: label || translated(intents[value.intent]) || UiSurfaces.t("feedback.world_combat.ui.companion"), right: translated(phases[phase]) || "", color: accent });
        if (typeof progress === "number") rows.push({ kind: "meter", value: progress, color: accent });
        if (reason) rows.push({ kind: "text", text: reason, color: 0xffb3c3b3 });
        guards.values().filter(guard => guard.actor === actor).slice(0, 2).forEach(guard => rows.push({ kind: "text", text: guard.label + " · " + Math.round(guard.remaining * 10) / 10 + (guard.unit === "charge" ? UiSurfaces.t("feedback.world_combat.ui.charges") : UiSurfaces.t("feedback.world_combat.ui.protection")), color: 0xffa8e5ed }));
        cardContributions.apply({ actor, value, anchor, rows });
        return { actor, selected: value.selected, rows, background: 0xe6182925, accent };
    }
    WorldCombatClient.scene("world_combat:companion", 1, frame => {
        const event = JSON.parse(frame.data()), data = event.data || {}, actor = CobblemonWorldUi.actor(data.actor || event.source);
        if (actor) layer.card("companion/" + actor, { actor, data }, 10);
    });
    WorldCombatClient.scene("world_combat:feedback", 1, frame => {
        layer.check();
        const event = JSON.parse(frame.data()), data = event.data || {};
        const start = Number(data.start); if (!isFinite(start) || layer.now() > start + (data.duration || 36)) return;
        results.publish(String(event.key) + "/" + start, event, Math.max(60, Number(data.duration || 36)));
    });
    results.listen("world-text", event => {
        const data = event.data || {}, kind = kinds[data.kind] || { label: "", color: 0xffeeeecc };
        const start = Number(data.start), duration = Math.max(12, Math.min(60, Number(data.duration || 28))), key = String(event.key) + "/" + start;
        const priority = data.priority || (data.kind === "critical" || data.kind === "immune" ? 2 : 0);
        const label = data.message ? UiSurfaces.plain(data.message)
            : data.key ? UiSurfaces.plain({ key: data.key, args: Array.isArray(data.args) ? data.args : [] })
            : translated(data.label || kind.label);
        const color = typeof data.color === "number" ? data.color : kind.color;
        const format = (value: WorldSurfaces.Floating) => {
            const amount = value.amount && value.amount > 0 ? Math.round(value.amount * 10) / 10 : "";
            let text = (data.kind === "heal" && amount !== "" ? "+" : "") + amount;
            if (label) text += (text ? " · " : "") + label;
            if (data.type && (data.kind === "damage" || data.kind === "critical")) text += " · " + UiSurfaces.t("cobblemon.type." + data.type);
            if (value.count! > 1) text += " ×" + value.count;
            if (typeof data.effectiveness === "number" && data.effectiveness > 1) text += " ↑";
            if (typeof data.effectiveness === "number" && data.effectiveness > 0 && data.effectiveness < 1) text += " ↓";
            return text;
        };
        layer.float(key, { start, duration: Math.max(duration, priority >= 2 ? 48 : 36), position: event.position,
            actor: data.kind === "work" ? "" : CobblemonWorldUi.actor(data.actor), amount: data.kind === "created" ? undefined : data.amount,
            priority, mergeKey: priority < 2 ? String(data.actor) + "/" + data.kind + "/" + (data.type || "") : undefined,
            format, color: color });
    });
    WorldCombatClient.scene("world_combat:guard", 1, frame => {
        layer.check(); const event = JSON.parse(frame.data()), data = event.data || {}, actor = CobblemonWorldUi.actor(data.actor);
        if (actor && typeof data.remaining === "number" && data.remaining > 0 && typeof data.start === "number" && layer.now() < data.start + data.duration)
            guards.put(String(event.key), { actor, label: String(data.label || UiSurfaces.t("feedback.world_combat.ui.protection_86")), remaining: data.remaining, unit: String(data.unit || "capacity") }, data.start + data.duration - layer.now());
    });
}
