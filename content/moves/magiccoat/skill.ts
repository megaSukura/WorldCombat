/**
 * 魔法反射 / magiccoat —— 执行组织、窗口与反弹交接。
 *
 * 核心念头：在身前铺一层会弯光的膜，把朝着自己递过来的状态招原路弹回去。
 *
 * 一幕分三段：
 *   撑（raise，提交前）：身前铺开一叠半透膜面，只播预告。
 *   等（film，提交前）：膜在 `window` 刻里撑开；每 8 刻重播一次，让玩家读出还剩多久。
 *   弹（reflect / collapse）：朝自己提交的、带 reflectable 旗标的状态招被顶回去；同一刻施法者用
 *     `NativeLoadout.call` 把那一手对准原施放者放出去——它落到他自己身上。没接到东西就收膜、不结账。
 *
 * 与抢夺分开：抢夺把对手给**自己**的招**拿过来**；魔法反射把朝着**你**来的招**弹回去**。
 * 反制：只接已实装、带 reflectable 旗标的招式；超出反射距离、墙后、或对手干脆不往你身上递都会收膜。
 *   reflectable 是原生旗标（异常状态招与寄生种子一类），伤害招不在此列。
 */
namespace PokemonSkills {
    export const magiccoatId = "magiccoat";
    export const magiccoatScene = "world_combat:move_magiccoat";
    export const magiccoatReflectText = "world_combat.move.magiccoat.text.reflect";

    interface CoatWindow { until: number; token: number; reach: number; }
    interface CoatCaught { move: string; from: string; at: number; }

    /** 谁把膜撑在身前：施法者 ref → 窗口。 */
    var magiccoatWindows: { [caster: string]: CoatWindow } = Object.create(null);
    /** 已经弹到、等着施法者打出的一手：施法者 ref → 待反射的招式。 */
    var magiccoatCaught: { [caster: string]: CoatCaught } = Object.create(null);
    var magiccoatTokenSeq = 0;

    /** 这一手能不能被弹：已实装、是变化招、带原生 reflectable 旗标。 */
    export function magiccoatReflectable(id: string): boolean {
        if (!skills[id]) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            if (String(move.category()) !== "status") return false;
            return !!NativeLoadout.facts(move).flags.reflectable;
        } catch (error) {
            return false;
        }
    }

    /** 把弹回的那一手对准原施放者。 */
    export function magiccoatCall(action: CombatAction, id: string, from: string): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense(), attacker = world.actor(from);
        if (attacker === null || !world.valid(attacker)) return null;
        const body = world.observe(attacker);
        if (body === null) return null;
        const point = body.position();
        let direction = point.minus(action.origin());
        if (direction.length() < 0.01) direction = action.direction();
        return { eligibility: "caller", input: { target: skill.kind === "enemy" ? attacker : null, point: point, direction: direction } };
    }

    // 窗口的判定端：朝施法者提交的可反射招式被顶回去，并把这一手留给撑膜的人打回原处。
    WorldCombat.on("world_combat:move_magiccoat/film", "world_combat:before_commit", "", function (event) {
        const action = event.action();
        if (action === null) return;
        const content = String(action.content());
        if (content === "world_combat:magiccoat" || content === "world_combat:snatch") return;
        const target = action.target();
        if (target === null) return;
        const world = event.world(), attacker = event.actor();
        if (String(attacker.domain()) !== "cobblemon") return;
        const casterRef = String(target.ref()), film = magiccoatWindows[casterRef];
        if (!film) return;
        const now = world.tick();
        if (now > film.until) { delete magiccoatWindows[casterRef]; return; }
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const id = String(executing.id());
        if (!magiccoatReflectable(id)) return;
        const caster = world.actor(casterRef), from = world.observe(attacker);
        if (caster === null || from === null || !world.valid(caster)
            || String(caster.key()) === String(attacker.key()) || world.friendly(caster)) {
            delete magiccoatWindows[casterRef]; return;
        }
        const shield = world.observe(caster);
        if (shield === null) { delete magiccoatWindows[casterRef]; return; }
        if (shield.position().minus(from.position()).length() > film.reach) return;
        event.reject("magiccoat");
        magiccoatCaught[casterRef] = { move: id, from: String(attacker.ref()), at: now };
    });

    define({
        id: magiccoatId,
        cooldownParameter: "recharge",
        name: "Magic Coat",
        description: "在身前铺开一层会弯光的膜：窗口内朝着自己递来的异常状态招与寄生种子一类会被原路弹回施放者；没接到东西就收膜。",
        uses: ["把铺到自己身上的毒、麻痹、寄生原样还回去", "在对手下状态前先一步撑膜", "让只会用状态招的敌人反受其害"],
        kind: "self",
        range: 7,
        maxRange: 15,
        style: "coat",
        defaults: { sweep: false, ai: { maxChase: 14, opening: "anytime", leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[magiccoatId], detail: { values: config } };
            return { radius: p(magiccoatId, "coatReach", context), geometry: "line", style: "coat", color: 0x8FE8FF,
                label: config && config.sweep === true ? "魔法反射·广膜" : "魔法反射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magiccoatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(magiccoatId, "tempo", context)),
                recover: 0,
                cooldown: Math.round(p(magiccoatId, "recharge", context)),
                active: 0,
                range: p(magiccoatId, "coatReach", context)
            };
        },
        run: function (action, _move, config) {
            const sweep = !!(config && config.sweep);
            const casterRef = String(action.actor().ref());
            const facets = Math.max(1, Math.round(p(magiccoatId, "facets", action)));
            delete magiccoatCaught[casterRef];
            action.present("world_combat:move_magiccoat:raise", magiccoatScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", facets: facets, sweep: sweep ? 1 : 0 }));
            action.after(Math.max(1, Math.round(p(magiccoatId, "tempo", action))), function (current) {
                const reach = p(magiccoatId, "coatReach", current);
                const window = Math.max(20, Math.round(p(magiccoatId, "window", current)));
                const until = current.sense().tick() + window;
                const token = ++magiccoatTokenSeq;
                magiccoatWindows[casterRef] = { until: until, token: token, reach: reach };
                function collapse(handle: CombatAction): void {
                    if (magiccoatWindows[casterRef] && magiccoatWindows[casterRef].token === token) delete magiccoatWindows[casterRef];
                    delete magiccoatCaught[casterRef];
                    handle.present("world_combat:move_magiccoat:collapse", magiccoatScene, 1, handle.origin(),
                        JSON.stringify({ moment: "collapse", facets: facets }));
                    handle.reject("no-reflect");
                }
                function step(handle: CombatAction, elapsed: number): void {
                    const held = magiccoatWindows[casterRef];
                    if (!held || held.token !== token) { delete magiccoatCaught[casterRef]; handle.reject("window-lost"); return; }
                    const caught = magiccoatCaught[casterRef];
                    if (caught !== undefined) {
                        delete magiccoatCaught[casterRef];
                        delete magiccoatWindows[casterRef];
                        const options = magiccoatCall(handle, caught.move, caught.from);
                        if (options === null) { collapse(handle); return; }
                        handle.data("world_combat:magiccoat/bounced", JSON.stringify({ move: caught.move, from: caught.from }));
                        handle.present("world_combat:move_magiccoat:reflect", magiccoatScene, 1, handle.origin(),
                            JSON.stringify({ moment: "reflect", facets: facets, target: caught.from,
                                path: [casterRef, caught.from], span: window }));
                        NativeLoadout.call(handle, caught.move, { input: options.input, eligibility: "caller",
                            cooldown: p(magiccoatId, "recharge", handle) });
                        return;
                    }
                    if (elapsed > window) { collapse(handle); return; }
                    if (elapsed % 8 === 0) handle.present("world_combat:move_magiccoat:film", magiccoatScene, 1, handle.origin(),
                        JSON.stringify({ moment: "film", facets: facets, remaining: Math.max(0, window - elapsed), span: window }));
                    handle.after(1, function (next) { step(next, elapsed + 1); });
                }
                step(current, 0);
            });
        }
    });

    // 弹回的那一手提交时：补上「弹回了 X」的浮字、一圈折返光与音效。
    WorldCombat.on("world_combat:move_magiccoat/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:magiccoat") return;
        const raw = action.data("world_combat:magiccoat/bounced");
        if (raw === null) return;
        const bounced = JSON.parse(raw), world = event.world(), actor = event.actor();
        const body = world.observe(actor);
        if (body === null) return;
        const executing = NativeLoadout.executing(action), id = executing === null ? "" : String(executing.id());
        WorldFeedback.emit(world, magiccoatScene, 1, body.position(),
            { moment: "reflect", target: String(actor.ref()), facets: Math.max(1, Math.round(p(magiccoatId, "facets", action))),
                path: [String(actor.ref()), String(bounced.from)], span: 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), magiccoatReflectText,
            [id ? { key: "cobblemon.move." + id, fallback: id } : ""], 36);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 12, "{}");
    });
}
