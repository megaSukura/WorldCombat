/**
 * 仿效 / copycat —— 注册与动作（自管节奏）。
 *
 * 借招必须在提交之前交接（NativeLoadout.call 沿用同一笔提交），所以本招自己驱动动作：
 *   起：脚下荡开一圈低低的回声（action.present 预告），同时看清场上最后响起的那一手。
 *   演：在回声窗口内、已实装、且不带 failcopycat 的那一手，经 NativeLoadout.call 原样使出——
 *       这一手提交时才结清 PP 与冷却，由借来的招式自己完成。读不到就退回不结账。
 *   落：提交（借招真正开始）时，由本单元的 committed 监听播出“仿效 X”的浮字与音效。
 *
 * 与鹦鹉学舌分开：仿效捡的是“全场最后响起的一手”，对谁都能捡（含变化与自用招）；
 *   鹦鹉学舌只还击眼前对手、且只还击它自己的上一手攻击。
 * 与挥指分开：挥指随机抽整个招式库，仿效必须有人先出过手，捡的是已发生的事。
 */
namespace PokemonSkills {
    /** 当前可捡的那一手 id；空串表示账本为空、过期、未实装或不可被仿效。 */
    export function copycatReadable(world: CombatWorld, snapshot: any): string {
        if (!snapshot || typeof snapshot.id !== "string" || !snapshot.id) return "";
        const tick = typeof snapshot.tick === "number" ? snapshot.tick : -1000;
        if (world.tick() - tick > p(copycatId, "window", world)) return "";
        // 出手者已经离场 / 不在附近时，回声没有来源，作废，避免捡起上一场残留的声音。
        if (typeof snapshot.ref === "string" && snapshot.ref) {
            try { if (world.actor(String(snapshot.ref)) === null) return ""; } catch (error) { return ""; }
        }
        const id = String(snapshot.id);
        if (!skills[id]) return "";
        if (NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.failcopycat) return "";
        return id;
    }

    export function copycatNearest(action: CombatAction, origin: CombatPoint, radius: number): CombatActor | null {
        const world = action.sense(), found = world.query(origin, Math.min(32, Math.max(1, radius)), false);
        let best: CombatActor | null = null, distance = Infinity;
        for (let i = 0; i < found.length; i++) {
            const actor = found[i];
            if (world.friendly(actor) || !world.valid(actor)) continue;
            const body = world.observe(actor);
            if (body === null) continue;
            const current = body.position().minus(origin).length();
            if (current < distance) { distance = current; best = actor; }
        }
        return best;
    }

    /** 把捡来的那一手映射成本次提交的目标输入；与挥指同一套借招映射。 */
    export function copycatCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense();
        if (skill.kind === "friend") {
            const self = action.actor(), body = world.observe(self);
            return body ? { eligibility: "caller", input: { target: self, point: body.position() } } : null;
        }
        const found = copycatNearest(action, action.origin(), action.range() + 2);
        if (found === null) return null;
        const body = world.observe(found);
        if (body === null) return null;
        const point = body.position();
        let direction = point.minus(action.origin());
        if (direction.length() < 0.01) direction = action.direction();
        return { eligibility: "caller", input: { target: skill.kind === "enemy" ? found : null, point: point, direction: direction } };
    }

    define({
        id: copycatId,
        name: "仿效",
        description: "捡起全场刚刚响起的那一手，原样再演一遍；场上还没人出过手时落空。",
        uses: ["把对手的强攻原样还回去", "复制队友的增益与布置", "在别人刚酝酿过后接上同一手"],
        kind: "self",
        range: 16,
        maxRange: 20,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 60,
        style: "echo",
        defaults: { deep: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config) {
            return { radius: 1.0, geometry: "point", style: "echo", color: 0x9FE8DC, label: "仿效" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[copycatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p(copycatId, "tempo", context),
                recover: p(copycatId, "aftercast", context),
                cooldown: p(copycatId, "recharge", context),
                active: 1,
                range: p(copycatId, "span", context)
            };
        },
        run: function (action, _move, _config) {
            const echoes = Math.max(1, Math.round(p(copycatId, "echoes", action)));
            action.present("world_combat:move_copycat:listen", copycatScene, 1, action.origin(),
                JSON.stringify({ moment: "listen", echoes: echoes, echo: copycatLedger === null ? "" : copycatLedger.id }));
            action.after(Math.max(1, Math.round(p(copycatId, "tempo", action))), function (current) {
                const world = current.sense();
                const found = copycatReadable(world, copycatLedger);
                const options = found ? copycatCall(current, found) : null;
                if (found === "" || options === null) {
                    current.present("world_combat:move_copycat:empty", copycatScene, 1, current.origin(),
                        JSON.stringify({ moment: "empty", echoes: echoes }));
                    current.reject("no-echo");
                    return;
                }
                current.present("world_combat:move_copycat:replay", copycatScene, 1, current.origin(),
                    JSON.stringify({ moment: "replay", echoes: echoes, echo: found }));
                NativeLoadout.call(current, found, { input: options.input, eligibility: "caller", cooldown: p(copycatId, "recharge", current) });
            });
        }
    });

    // 借来的招式真正提交的那一刻：补上“仿效 X”的浮字与一道镜音。
    WorldCombat.on("world_combat:move_copycat/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:copycat") return;
        const world = event.world(), actor = event.actor(), executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const id = String(executing.id());
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), copycatCopyText,
            [{ key: "cobblemon.move." + id, fallback: id }], 34);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 16, "{}");
    });
}
