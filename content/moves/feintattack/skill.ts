/**
 * 出奇一击 / feintattack 的出手方式。
 *
 * 核心念头：先悄悄贴近，趁对手没在看那一侧之前闪到它真正的背侧，贴着背打一记接触短拳——对手根本没在防那一侧。
 *
 * 两幕：
 *   起（gather，提交前）：身影暗下去、暗影在脚下收拢（很淡的预告——这正是「出奇」）。
 *   袭（vanish → decoy → strike / whiff）：提交后按目标**当前真实面对方向与实际身体箱**在背侧试落脚点，
 *       落点距离从目标体表起算；站不到正背就退到侧后（记 `flank`，表现读作侧袭）；闪到落点后按**真实拳距与首碰**重新判定——
 *       先用仅方块的原生 clip 裁出实墙，再在裁剪后的拳路上取最近的**真实首体**；第一个身体（含同伴）决定拳是否被吸收，
 *       只有首个身体是非友方时才吃这一拳，隔墙或目标走远就只落点空拳，不会直接伤旧 ref。
 *       落点还必须落在本次 `reach` 突进预算内，够不到就不闪。
 *       若开了 `decoy`，先在对手正面留一个可受击暗影替身短暂引开注意力；替身没出来也不取消本次真实拳。
 *       预算内没有可站落点就留在原处收拳挥空。
 *   空（无实体）：朝瞄点方向短闪到一处能站下的位置，落点打出同一记短拳，进入拳路的敌人照样被触及。
 *
 * 与同族分开：燕返是掠过一整条刀路、扫路上所有人、落在对手身后；出奇一击是**瞬移到对手背侧的一记接触拳**，
 *   还可用替身把对手的注意力钉在正面。暗影拳则由本体不动、拳从目标自己的影子里冒出（见 shadowpunch）。
 */
namespace PokemonSkills {
    const feintattackScene = "world_combat:move_feintattack";
    const feintattackMissText = "world_combat.move.feintattack.text.miss";
    const feintattackStrikeText = "world_combat.move.feintattack.text.strike";

    /** 施法者的脚底位置。 */
    function feintFeet(facts: CombatObservation): CombatPoint {
        return facts.position().minus(WorldCombat.point(0, facts.height() / 2, 0));
    }

    /** 目标此刻真正背对施术者的水平方向；朝向竖直或读不到时退回施术者→目标方向（远离施术者的一侧）。 */
    function feintBack(world: CombatWorld, target: CombatActor, away: CombatPoint): CombatPoint {
        const look = WorldGeometry.facing(world, target);
        const back = look === null ? WorldCombat.point(0, 0, 0) : look.scale(-1);
        return WorldGeometry.flatUnit(back, away);
    }

    /**
     * 背侧可站位候选，按目标**实际身体箱**沿真实背向展开：正背、左后 55°、右后 55°。
     * 落点距离 = 目标身体表面对背向的支撑距离 + behind，保证一记拳距正好够到体表。
     */
    export function feintApproachSpots(world: CombatWorld, target: CombatActor, away: CombatPoint, behind: number): CombatPoint[] {
        const body = world.observe(target);
        if (body === null) return [];
        const low = body.boundsMin(), high = body.boundsMax();
        const halfX = Math.max(0, (high.x() - low.x()) / 2), halfZ = Math.max(0, (high.z() - low.z()) / 2);
        const centre = WorldCombat.point(body.position().x(), feintFeet(body).y(), body.position().z());
        const back = feintBack(world, target, away);
        const turn = 55 * Math.PI / 180, cos = Math.cos(turn), sin = Math.sin(turn);
        const sideA = WorldCombat.point(back.x() * cos - back.z() * sin, 0, back.x() * sin + back.z() * cos);
        const sideB = WorldCombat.point(back.x() * cos + back.z() * sin, 0, -back.x() * sin + back.z() * cos);
        return [back, sideA, sideB].map(direction => {
            const edge = Math.min(Math.abs(direction.x()) > 1e-6 ? halfX / Math.abs(direction.x()) : Infinity,
                Math.abs(direction.z()) > 1e-6 ? halfZ / Math.abs(direction.z()) : Infinity);
            return centre.plus(direction.scale(edge + behind));
        });
    }

    /** 从实际身体箱候选里找一处能站下、且施法者一步位移预算内的落点；站到正背 flank=false，退到侧后 flank=true。 */
    export function feintLanding(world: CombatWorld, actor: CombatActor, target: CombatActor, away: CombatPoint, behind: number, budget: number): { point: CombatPoint; flank: boolean } | null {
        const facts = world.observe(actor);
        if (facts === null) return null;
        const feet = feintFeet(facts), spots = feintApproachSpots(world, target, away, behind);
        for (let i = 0; i < spots.length; i++) {
            const spot = LivingActions.freeSpot(world, spots[i], facts.width(), facts.height(), 1.5);
            if (spot === null || spot.minus(feet).length() > budget + 1e-6) continue;
            return { point: spot, flank: i > 0 };
        }
        return null;
    }

    /** 自由瞄准：朝瞄点方向短闪到一处能站下的位置；无实体的空放也走这里。 */
    export function feintShift(world: CombatWorld, actor: CombatActor, desired: CombatPoint): CombatPoint | null {
        const facts = world.observe(actor);
        if (facts === null) return null;
        return LivingActions.freeSpot(world, desired, facts.width(), facts.height(), 1.5);
    }

    define({
        freeMovement: true,
        id: "feintattack",
        cooldownParameter: "recharge",
        name: "Feint Attack",
        description: "悄悄贴近，闪到对手真正的背侧打一记不会被闪避的接触短拳；站不到正背就退到侧后侧袭。开启佯攻时先在正面留一个暗影替身，把敌人的攻击目标引到替身上。到达后按真实拳距与首碰结算，隔墙或离得太远只落点空拳；没有选中实体时朝瞄点短闪一段并打出同一记短拳。",
        uses: ["悄悄绕到对手背侧打一记重拳", "用暗影替身把对手的注意力钉在正面", "收拾正在盯着别人的目标"],
        kind: "aim",
        range: 6.5,
        maxRange: 10,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 45,
        style: "dark",
        defaults: { decoy: false, ai: { maxChase: 9, backline: true, caution: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("feintattack", "reach", pokemon), geometry: "point", style: "dark", color: 0x7A5FD0,
                label: config && config.decoy === true ? "出奇一击·佯攻" : "出奇一击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["feintattack"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const decoy = !!(config && config.decoy);
            return {
                prepare: Math.round(p("feintattack", "tempo", context)) + (decoy ? 4 : 0),
                recover: Math.round(p("feintattack", "settle", context)),
                cooldown: Math.round(p("feintattack", "recharge", context)) + (decoy ? 8 : 0),
                active: 0,
                range: p("feintattack", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("feintattack:gather", feintattackScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare,
                    target: action.target() === null ? "" : String(action.target()!.ref()),
                    decoy: !!(config && config.decoy) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const target = action.target();
            const decoy = !!(config && config.decoy);
            const power = p("feintattack", "strike", action);
            const behind = p("feintattack", "behind", action);
            const reach = p("feintattack", "reach", action);
            const decoyTicks = Math.max(20, Math.round(p("feintattack", "decoyTicks", action)));

            function miss(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, feintattackScene, 1, at, { moment: "miss", decoy: decoy ? 1 : 0 }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), feintattackMissText, [], 22);
                scope.sound("minecraft:entity.vex.ambient", at, 12, "{}");
                done(current);
            }

            if (self === null) { miss(action, action.origin()); return; }
            const origin = self.position();
            const aimPoint = action.targetPosition();
            const flat = WorldCombat.point(aimPoint.x() - origin.x(), 0, aimPoint.z() - origin.z());
            // 自由 aim：方向或世界点的水平分量都可为零，退回施法方向后仍能空放。
            const heading = WorldGeometry.flatUnit(flat, action.direction());
            const feetOrigin = feintFeet(self);
            let flank = false;

            let feet: CombatPoint | null = null;
            if (target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) {
                    // 从目标实际身体箱取背/侧后落点，并限制在本次 reach 突进预算内。
                    const landing = feintLanding(world, actor, target, heading, behind, reach);
                    if (landing !== null) { feet = landing.point; flank = landing.flank; }
                }
            } else {
                // 没有选中实体：朝瞄点方向短闪到一处能站下的位置。
                feet = feintShift(world, actor, feetOrigin.plus(heading.scale(Math.min(reach, flat.length()))));
            }
            if (feet === null) { miss(action, origin); return; }
            if (feet.minus(feetOrigin).length() > reach + 1e-6) { miss(action, origin); return; }

            sound(action, "minecraft:entity.enderman.teleport");
            if (!world.teleport(actor, feet)) { miss(action, origin); return; }
            // 只在真正移动时闪灭。
            WorldFeedback.emit(world, feintattackScene, 1, origin,
                { moment: "vanish", point: [origin.x(), origin.y(), origin.z()],
                    decoy: decoy ? 1 : 0, power: Math.round(power * 10) / 10 }, 22);
            const moved = world.observe(actor);
            const landing = moved === null ? feet : moved.position();

            if (decoy && target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) {
                    // 替身站在对手真正面朝的一侧，才可能被它看见并吸引注意。
                    const look = WorldGeometry.facing(world, target);
                    const faceDir = WorldGeometry.flatUnit(look === null ? WorldCombat.point(0, 0, 0) : look, heading);
                    const front = body.position().plus(faceDir.scale(1.3)).plus(WorldCombat.point(0, 0.1, 0));
                    let silhouette: CombatActor | null = null;
                    try {
                        silhouette = world.helper(front, 20,
                            JSON.stringify({ sprite: "cobblemon:generic/smoke/smoke", tint: 0x2A2140, glow: false, scale: 1 }), decoyTicks);
                    } catch (error) { silhouette = null; }
                    if (silhouette !== null) {
                        // 只用现有仇恨接口尝试转移注意力，不强改 Boss 目标。
                        world.target(target, silhouette);
                        WorldFeedback.emit(world, feintattackScene, 1, front,
                            { moment: "decoy", target: String(target.ref()), decoy: String(silhouette.ref()) }, 26);
                    }
                }
            }

            // 到达后按真实拳距/首碰重新 trace：只打真正够到并触及的非友方，隔墙或目标走远就落点空拳。
            let punchDir = heading;
            if (target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) {
                    const nearest = world.closestPoint(target, landing);
                    const toBody = WorldCombat.point(nearest.x() - landing.x(), 0, nearest.z() - landing.z());
                    if (toBody.length() > 0.05) punchDir = toBody.unit();
                }
            }
            const punchLength = Math.max(0.6, behind);
            const punchRadius = Math.max(0.25, Math.min(0.55, (moved === null ? 0.9 : moved.width()) * 0.35));
            let touched: CombatActor | null = null, contactPoint: CombatPoint = landing;
            if (moved !== null) {
                const from = moved.position(), intended = from.plus(punchDir.scale(punchLength));
                // 仅方块的原生 clip 裁出实墙：实体命中不掩盖其后的墙。
                const wall = WorldGeometry.blockHit(world, from, intended);
                const stop = wall !== null ? wall.position() : intended;
                const contacts: { actor: CombatActor; point: CombatPoint; distance: number }[] = [];
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(from, stop, punchRadius), function (other) {
                    if (String(other.ref()) === String(actor.ref())) return;
                    const point = world.closestPoint(other, from);
                    contacts.push({ actor: other, point: point, distance: point.minus(from).length() });
                });
                contacts.sort(function (a, b) { return a.distance - b.distance; });
                // 最近的真实首体决定拳路：同伴在前会吸收这一拳，只有首个身体是非友方才吃伤害。
                if (contacts.length > 0 && !world.friendly(contacts[0].actor)) {
                    touched = contacts[0].actor; contactPoint = contacts[0].point;
                }
            }

            let landed = false;
            if (touched !== null)
                landed = hurt(action, touched, "feintattack", power,
                    { damage: damageSpec("feintattack", "strike"), contact: true });

            const payload: any = { moment: landed ? "strike" : "whiff",
                target: touched !== null ? String(touched.ref()) : (target !== null ? String(target.ref()) : ""),
                decoy: decoy ? 1 : 0, power: Math.round(power * 10) / 10, scale: behind / 0.85,
                flank: flank ? 1 : 0, ringColor: flank ? 0x8A78C8 : 0x4A3A78 };
            if (landed) {
                payload.point = [contactPoint.x(), contactPoint.y(), contactPoint.z()];
                payload.path = [[landing.x(), landing.y(), landing.z()], [contactPoint.x(), contactPoint.y(), contactPoint.z()]];
            }
            WorldFeedback.emit(world, feintattackScene, 1, landed ? contactPoint : landing, payload, 28);
            if (landed) {
                world.sound("cobblemon:impact.dark", contactPoint, 16, "{}");
                WorldFeedback.text(world, contactPoint.plus(WorldCombat.point(0, 1.1, 0)), feintattackStrikeText, [], 24);
            } else {
                world.sound("minecraft:entity.vex.ambient", landing, 12, "{}");
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.1, 0)), feintattackMissText, [], 22);
            }
            done(action);
        }
    });
}
