/** Copy bonuses live on this execution; native replays need their own real contact or flight. */
namespace PokemonSkills {
    PokemonDamage.metadata.define({ id: "world_combat:move_mirrormove/gloss", apply: context => {
        if (!context.world) return;
        const data = MoveExecutions.read(context.world, "world_combat:mirrormove/gloss");
        if (data && data.move === String(context.metadata.move)) context.metadata.power *= data.factor;
    } });

    /** 目标最近一次可折返的招式 id；空串表示无。 */
    export function mirrorRead(world: CombatWorld, target: CombatActor | null): string {
        if (target === null || !world.valid(target) || String(target.domain()) !== "cobblemon") return "";
        const last = NativeEffects.lastMove(world, target);
        if (last === null) return "";
        if (world.tick() - last.tick > p(mirrormoveId, "focus", world)) return "";
        const id = String(last.id);
        if (!skills[id]) return "";
        if (!NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.mirror) return "";
        return id;
    }

    /** 把折返的那一手瞄准目标本人；自用招仍作用于自己。 */
    export function mirrorCall(action: CombatAction, id: string, target: CombatActor | null): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense();
        if (skill.kind === "friend") {
            const self = action.actor(), body = world.observe(self);
            return body ? { eligibility: "caller", input: { target: self, point: body.position() } } : null;
        }
        if (target === null || !world.valid(target)) return null;
        const body = world.observe(target);
        if (body === null) return null;
        const point = action.target() && String(action.target()!.ref()) === String(target.ref()) ? action.targetPosition() : body.position();
        let direction = point.minus(action.origin());
        if (direction.length() < 0.01) direction = action.direction();
        return { eligibility: "caller", input: { target: skill.kind === "enemy" || skill.kind === "aim" ? target : null, point: point, direction: direction } };
    }

    define({
        id: mirrormoveId,
        cooldownParameter: "recharge",
        name: "鹦鹉学舌",
        description: "向对手回敬其最近的可模仿招式；普通生物的已识别近战回放为短影击，标准投射回放为真实碰撞的影弹。",
        uses: ["把对手的上一手还给它", "拆刚打完一轮强攻的敌人", "在受击前一拍抢回节奏"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 6,
        active: 0,
        recover: 4,
        cooldown: 55,
        style: "mirror",
        defaults: { keen: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            return { radius: p(mirrormoveId, "reach", pokemon), geometry: "line", style: "mirror", color: 0x7FD0E8,
                label: read(config, ["keen"]) === true ? "鹦鹉学舌·锐镜" : "鹦鹉学舌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[mirrormoveId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p(mirrormoveId, "tempo", context),
                recover: p(mirrormoveId, "aftercast", context),
                cooldown: p(mirrormoveId, "recharge", context),
                active: 0,
                range: p(mirrormoveId, "reach", context)
            };
        },
        run: function (action, _move, config) {
            const target = action.target();
            const mirrors = Math.max(1, Math.round(p(mirrormoveId, "mirrors", action)));
            const keen = read(config, ["keen"]) === true;
            const origin = action.origin();
            let heading = action.targetPosition().minus(origin);
            if (heading.length() < 0.001) heading = action.direction();
            const unit = heading.length() > 0.001 ? heading.unit() : action.direction();
            // 镜屏立在身体前方、朝向对手：按真实碰撞箱沿瞄准方向取身体前点，作为发射器偏移。
            const body = action.sense().observe(action.actor());
            let front: number[] = [0, 0, 0];
            if (body !== null) {
                const min = body.boundsMin(), max = body.boundsMax();
                const hx = (max.x() - min.x()) / 2, hz = (max.z() - min.z()) / 2;
                const along = Math.abs(unit.x()) * hx + Math.abs(unit.z()) * hz + 0.08;
                front = [unit.x() * along, 0, unit.z() * along];
            }
            action.present("world_combat:move_mirrormove:brace", mirrorScene, 1, origin,
                JSON.stringify({ moment: "brace", target: target === null ? "" : String(target.ref()), mirrors: mirrors,
                    keen: keen ? 1 : 0, direction: [unit.x(), unit.y(), unit.z()], front: front }));
            action.after(Math.max(1, Math.round(p(mirrormoveId, "tempo", action))), function (current) {
                const world = current.sense();
                if (target !== null && String(target.domain()) !== "cobblemon") {
                    const replay = NativeAttackProjection.recent(world, target, p(mirrormoveId, "focus", current));
                    const at = world.observe(target);
                    const closest = at === null || target === null ? null : world.closestPoint(target, current.origin());
                    if (!replay || closest === null || !world.clear(current.origin(), closest)) { current.reject("no-mirror"); return; }
                    NativeAttackProjection.prepare(current, replay);
                    current.commit(p(mirrormoveId, "recharge", current));
                    playNativeCopy(current, replay, mirrormoveId, p(mirrormoveId, "edge", current), mirrorScene,
                        p(mirrormoveId, "aftercast", current), replay.kind === "contact" ? "world_combat.move.mirrormove.text.native_contact" : "world_combat.move.mirrormove.text.native_projectile");
                    return;
                }
                // 正式招与原生分支用同一套距离/视线核对，再真正消费；目标脱视、过期或隔墙一律不折。
                const found = mirrorRead(world, target);
                const echoBody = target === null ? null : world.observe(target);
                const closest = echoBody === null || target === null ? null : world.closestPoint(target, current.origin());
                const reach = p(mirrormoveId, "reach", current);
                const options = found !== "" && closest !== null && closest.minus(current.origin()).length() <= reach
                    && world.clear(current.origin(), closest) ? mirrorCall(current, found, target) : null;
                if (found === "" || options === null) {
                    current.present("world_combat:move_mirrormove:dull", mirrorScene, 1, current.origin(),
                        JSON.stringify({ moment: "dull", mirrors: mirrors }));
                    current.reject("no-mirror");
                    return;
                }
                const edge = p(mirrormoveId, "edge", current);
                current.data("world_combat:mirrormove/gloss", JSON.stringify({ move: found, factor: edge }));
                const targetRef = target === null ? "" : String(target!.ref());
                current.present("world_combat:move_mirrormove:reflect", mirrorScene, 1, current.origin(),
                    JSON.stringify({ moment: "reflect", mirrors: mirrors, edge: edge, target: targetRef,
                        path: [String(current.actor().ref()), targetRef === "" ? String(current.actor().ref()) : targetRef] }));
                NativeLoadout.call(current, found, { input: options.input, eligibility: "caller", cooldown: p(mirrormoveId, "recharge", current) });
            });
        }
    });

    // 借来的招式提交的那一刻：补上锐镜增幅、折返的浮字、落点爆开与音效。
    WorldCombat.on("world_combat:move_mirrormove/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:mirrormove") return;
        const world = event.world(), actor = event.actor(), executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const id = String(executing.id());
        const raw = action.data("world_combat:mirrormove/gloss");
        if (raw === null) return;
        if (raw !== null) {
            const gloss = JSON.parse(raw);
            if (gloss.move === id && Number(gloss.factor) > 1) MoveExecutions.write(world, "world_combat:mirrormove/gloss", gloss);
        }
        WorldFeedback.emit(world, mirrorScene, 1, body.position(),
            { moment: "burst", mirrors: Math.max(1, Math.round(p(mirrormoveId, "mirrors", action))), edge: p(mirrormoveId, "edge", action),
                target: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), mirrorReflectText,
            [{ key: "cobblemon.move." + id, fallback: id }], 34);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 16, "{}");
    });
}
