/**
 * 仿效 / copycat —— 注册与动作（自管节奏）。
 *
 * 借招必须在提交之前交接（NativeLoadout.call 沿用同一笔提交），所以本招自己驱动动作：
 *   起：脚下荡开一圈低低的回声（action.present 预告），同时看清场上的短期账本。
 *   演：在附近（span 内）挑出时间最新、已实装、且不带 failcopycat 的那一手，先亮出真实借招名，
 *       再把玩家当前 aim 的实体/点交给它，经 NativeLoadout.call 原样使出——提交时才结清 PP 与冷却，
 *       由借来的招式自己完成。读不到、或借来的招需要目标而这次没给到合法目标，就退回不结账。
 *   落：借招真正提交时，由本单元的 committed 监听播出“仿效 X”的浮字与音效。
 *
 * 与鹦鹉学舌分开：仿效捡的是“附近最近响起的一手”，对谁都能捡（含变化与自用招），并交出瞄准；
 *   鹦鹉学舌只还击眼前对手、且只还击它自己的上一手攻击。
 * 与挥指分开：挥指随机抽整个招式库，仿效必须有人先出过手，捡的是已发生的事。
 */
namespace PokemonSkills {
    /** 单条回声是否仍可借：窗口内、出手者还在、已实装、不带 failcopycat；空串表示不可借。 */
    export function copycatReadable(world: CombatWorld, snapshot: any): string {
        if (!snapshot || typeof snapshot.id !== "string" || !snapshot.id) return "";
        const tick = typeof snapshot.tick === "number" ? snapshot.tick : -1000;
        if (world.tick() - tick > p(copycatId, "window", world)) return "";
        // 出手者已经离场时，这条回声没有来源，作废，避免捡起上一场残留的声音。
        if (typeof snapshot.ref === "string" && snapshot.ref) {
            try { if (world.actor(String(snapshot.ref)) === null) return ""; } catch (error) { return ""; }
        }
        const id = String(snapshot.id);
        if (!skills[id]) return "";
        if (NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.failcopycat) return "";
        return id;
    }

    /**
     * 附近最新的一条合法回声：先按出手者与施术者的距离筛掉远处战斗，再在本地记录里取时间最新的一条。
     * 这样远处地图上的施法不会抢走本地刚发生的动作。
     */
    export function copycatCandidate(world: CombatWorld, origin: CombatPoint, radius: number): CopycatEcho | null {
        const refs = Object.keys(copycatEchoes), now = world.tick();
        let best: CopycatEcho | null = null, bestTick = -2000, bestDistance = Infinity;
        for (let i = 0; i < refs.length; i++) {
            const echo = copycatEchoes[refs[i]];
            if (now - echo.tick > 1200) { delete copycatEchoes[refs[i]]; continue; }
            if (copycatReadable(world, echo) === "") continue;
            let body: CombatObservation | null = null;
            try { const actor = world.actor(echo.ref); body = actor === null ? null : world.observe(actor); } catch (error) { body = null; }
            if (body === null) continue;
            const distance = body.position().minus(origin).length();
            if (distance > radius) continue;
            if (echo.tick > bestTick || echo.tick === bestTick && distance < bestDistance) { best = echo; bestTick = echo.tick; bestDistance = distance; }
        }
        return best;
    }

    /**
     * 把捡来的那一手映射成本次手动 aim 的输入：
     *   self   → 自己；friend → 选中的友方，没有就给自己；enemy → 选中的非友方，没有就作废（不改对方的敌友要求）；
     *   point/motion/aim → 保留玩家选中的点，可以空放。PP、资格与 failcopycat 由 NativeLoadout.call 独立校验。
     */
    export function copycatCall(action: CombatAction, id: string, aim: CombatActor | null, at: CombatPoint): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        const world = action.sense();
        if (skill.kind === "self") {
            const input = NativeLoadout.inputFor(action, id, action.actor(), at);
            return input === null ? null : { eligibility: "caller", input: input };
        }
        if (skill.kind === "friend") {
            let recipient = aim !== null && world.valid(aim) && world.friendly(aim) ? aim : action.actor();
            if (!world.valid(recipient)) recipient = action.actor();
            // 友方招的点用接收者自己的身体，不用敌人那边的瞄准点。
            const input = NativeLoadout.inputFor(action, id, recipient, undefined);
            return input === null ? null : { eligibility: "caller", input: input };
        }
        if (skill.kind === "enemy") {
            if (aim === null || !world.valid(aim) || world.friendly(aim)) return null;
            const input = NativeLoadout.inputFor(action, id, aim, at);
            return input === null ? null : { eligibility: "caller", input: input };
        }
        // point / motion / aim：可空放，保留玩家选中的点。
        const input = NativeLoadout.inputFor(action, id, null, at);
        return input === null ? null : { eligibility: "caller", input: input };
    }

    define({
        id: copycatId,
        cooldownParameter: "recharge",
        name: "仿效",
        description: "捡起附近刚刚响起的那一手，原样再演一遍；场上还没人出过手、或借来的招没有合法目标时落空。",
        uses: ["把附近对手的强攻借来打回去", "复制队友的增益与布置", "在别人刚酝酿过后接上同一手"],
        kind: "aim",
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
            return { radius: 1.0, geometry: "line", style: "echo", color: 0x9FE8DC, label: "仿效" };
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
                JSON.stringify({ moment: "listen", echoes: echoes }));
            action.after(Math.max(1, Math.round(p(copycatId, "tempo", action))), function (current) {
                const world = current.sense();
                const body = world.observe(current.actor());
                const origin = body === null ? current.origin() : body.position();
                const echo = copycatCandidate(world, origin, Math.max(1, current.range()));
                const found = echo === null ? "" : copycatReadable(world, echo);
                const options = echo === null || found === "" ? null : copycatCall(current, found, current.target(), current.targetPosition());
                if (echo === null || found === "") {
                    current.present("world_combat:move_copycat:empty", copycatScene, 1, current.origin(),
                        JSON.stringify({ moment: "empty", echoes: echoes }));
                    current.reject("no-echo");
                    return;
                }
                if (options === null) {
                    current.present("world_combat:move_copycat:aimless", copycatScene, 1, current.origin(),
                        JSON.stringify({ moment: "aimless", echoes: echoes, echo: found }));
                    current.present("world_combat:move_copycat:aimless-text", "world_combat:feedback", 1, origin,
                        JSON.stringify({ kind: "world-text", start: world.tick(), duration: 26, key: copycatTargetText,
                            args: [{ key: "cobblemon.move." + found, fallback: found }], actor: String(current.actor().ref()) }));
                    current.reject("no-target");
                    return;
                }
                const source = String(echo.ref), caster = String(current.actor().ref());
                // 复制前先亮出真实借招名，来源处再抽一道短影线连到施术者。
                current.present("world_combat:move_copycat:name", "world_combat:feedback", 1, origin,
                    JSON.stringify({ kind: "world-text", start: world.tick(), duration: 26, key: copycatCopyText,
                        args: [{ key: "cobblemon.move." + found, fallback: found }], actor: caster }));
                current.present("world_combat:move_copycat:replay", copycatScene, 1, origin,
                    JSON.stringify({ moment: "replay", echoes: echoes, echo: found, path: [source, caster] }));
                NativeLoadout.call(current, found, { input: options.input, eligibility: "caller", cooldown: p(copycatId, "recharge", current) });
            });
        }
    });

    // 借来的招式真正提交的那一刻：补上音效与来源提示（“仿效 X”的浮字已在复制前由 run 亮出）。
    WorldCombat.on("world_combat:move_copycat/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:copycat") return;
        const world = event.world(), actor = event.actor(), executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 16, "{}");
    });
}
