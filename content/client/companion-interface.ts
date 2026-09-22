/** PokemonSkills contributes its authored vocabulary and state summaries to the shared companion adapter. */
namespace CompanionInterface {
    export const summaries = new WorldContributions.Registry<{ details: any; parts: string[] }>();
    export const intents: { [key: string]: any } = { follow: {key:"worldcombat.ui.intents.follow"}, hold: {key:"worldcombat.ui.intents.hold"}, stay: {key:"worldcombat.ui.intents.stay"}, protect: {key:"worldcombat.ui.intents.protect"}, work: {key:"worldcombat.ui.intents.work"}, autonomous: {key:"worldcombat.ui.intents.autonomous"}, free: {key:"worldcombat.ui.intents.free"}, focus: {key:"worldcombat.ui.intents.focus"} };
    export const phases: { [key: string]: any } = { idle: {key:"worldcombat.ui.phases.idle"}, preparing: {key:"worldcombat.ui.phases.preparing"}, running: {key:"worldcombat.ui.phases.running"}, active: {key:"worldcombat.ui.phases.active"}, recovering: {key:"worldcombat.ui.phases.recovering"}, recover: {key:"worldcombat.ui.phases.recover"}, prepare: {key:"worldcombat.ui.phases.prepare"},
        approaching: {key:"worldcombat.ui.phases.approaching"}, attending: {key:"worldcombat.ui.phases.attending"}, retreating: {key:"worldcombat.ui.phases.retreating"}, blocked: {key:"worldcombat.ui.phases.blocked"}, maintaining: {key:"worldcombat.ui.phases.maintaining"},
        searching: {key:"worldcombat.ui.phases.searching"}, checking: {key:"worldcombat.ui.phases.checking"}, waiting: {key:"worldcombat.ui.phases.waiting"}, observing: {key:"worldcombat.ui.phases.observing"} };
    export const reasons: { [key: string]: any } = { "needs-sunlight": {key:"worldcombat.ui.reasons.needs-sunlight"}, "light-full": {key:"worldcombat.ui.reasons.light-full"}, "sunlight-lost": {key:"worldcombat.ui.reasons.sunlight-lost"},
        "world_combat:care": {key:"worldcombat.ui.reasons.companion.care"}, "world_combat:prepare": {key:"worldcombat.ui.reasons.companion.prepare"}, "world_combat:warning": {key:"worldcombat.ui.reasons.companion.warning"}, "world_combat:control": {key:"worldcombat.ui.reasons.companion.control"},
        "world_combat:attack": {key:"worldcombat.ui.reasons.companion.attack"}, "world_combat:attending": {key:"worldcombat.ui.reasons.companion.attending"}, "world_combat:retreating": {key:"worldcombat.ui.reasons.companion.retreating"}, "world_combat:free": {key:"worldcombat.ui.reasons.companion.free"}, "world_combat:autonomous": {key:"worldcombat.ui.reasons.companion.autonomous"}, "world_combat:hold": {key:"worldcombat.ui.reasons.companion.hold"}, "world_combat:returning": {key:"worldcombat.ui.reasons.companion.returning"},
        "target-left": {key:"worldcombat.ui.reasons.target-left"}, "out-of-range": {key:"worldcombat.ui.reasons.out-of-range"}, "invalid-target": {key:"worldcombat.ui.reasons.invalid-target"},
        "target-not-visible": {key:"worldcombat.ui.reasons.target-not-visible"}, "capture-in-progress": {key:"worldcombat.ui.reasons.capture-in-progress"},
        "path-blocked": {key:"worldcombat.ui.reasons.path-blocked"}, "no-usable-skill": {key:"worldcombat.ui.reasons.no-usable-skill"}, "skill-unavailable": {key:"worldcombat.ui.reasons.skill-unavailable"},
        "control-preserved": {key:"worldcombat.ui.reasons.control-preserved"} };
    CobblemonCompanionUi.install({ id: "world_combat", legacyIds: ["verdant"], channel: "world_combat:skills", actionPrefix: "world_combat:", selectionScene: "world_combat:command",
        world: CompanionWorldUi, intents, phases, reasons,
        executeCommand: (item: any, _aim: any, bridge: any) => {
            if (item.command !== "select-companion") return false;
            bridge.select(String(item.individual)); return true;
        },
        effects: { target: (frame: CombatClientFrame) => IndicatorGeometry.draw(frame, JSON.parse(frame.data()).data || {}), cancelTarget: () => {} },
        hudExtra: (details: any) => {
            const context = summaries.apply({ details, parts: [] }); return context.parts.join(" · ");
        }
    });
}
