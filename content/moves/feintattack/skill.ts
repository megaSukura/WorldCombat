/**
 * 出奇一击 / feintattack 的出手方式。
 *
 * 核心念头：先悄悄贴近，在对手没看那一侧之前闪到它背后，贴着背打一记——对手根本没在防那一侧，所以必中。
 *
 * 两幕：
 *   起（gather，提交前）：身影暗下去、暗影在脚下收拢（很淡的预告——这正是「出奇」）。
 *   袭（vanish → decoy → strike）：提交后先在背后与侧后各试一次可落脚位置；真正移动时才闪灭身影，
 *       闪到对手背后贴着背打出 `strike` 接触伤害；若开了 `decoy`，先在对手正面留一个暗影替身短暂引开它的注意力。
 *       两处都站不下就留在原处收拳挥空，不跨越障碍硬结算伤害。
 *   空（无实体）：朝瞄点短闪到一处能站下的位置，空拳收势。
 *
 * 与同族分开：燕返是掠过一整条刀路、扫路上所有人、落在对手身后；出奇一击是**瞬移到选定对手背后的一记接触拳**，
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

    /** 在期望的脚底落点附近找一处能站下的位置；宿主没有落脚探针时返回 null。 */
    function feintLanding(world: CombatWorld, actor: CombatActor, desired: CombatPoint): CombatPoint | null {
        const facts = world.observe(actor);
        if (facts === null) return null;
        return LivingActions.freeSpot(world, desired, facts.width(), facts.height(), 1.5);
    }

    define({
        freeMovement: true,
        id: "feintattack",
        cooldownParameter: "recharge",
        name: "Feint Attack",
        description: "悄悄贴近，闪到对手背后打一记不会被闪避的接触重拳；开启佯攻时先在正面留一个暗影替身，把敌人的攻击目标引到替身上。没有选中实体时朝瞄点短闪一段、空拳收势；两处落点都站不下就留在原处挥空。",
        uses: ["悄悄绕到对手背后打一记重拳", "用暗影替身把对手的注意力钉在正面", "收拾正在盯着别人的目标"],
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
            if (flat.length() < 0.01) { miss(action, origin); return; }
            const heading = flat.unit();
            const feetOrigin = feintFeet(self);

            let feet: CombatPoint | null = null;
            if (target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) {
                    // 背后与侧后各试一次可落脚位置。
                    const base = WorldCombat.point(body.position().x(), feintFeet(body).y(), body.position().z());
                    const turn = 55 * Math.PI / 180, cos = Math.cos(turn), sin = Math.sin(turn);
                    const sideDir = WorldCombat.point(heading.x() * cos - heading.z() * sin, 0, heading.x() * sin + heading.z() * cos);
                    feet = feintLanding(world, actor, base.plus(heading.scale(behind)))
                        || feintLanding(world, actor, base.plus(sideDir.scale(behind)));
                }
            } else {
                // 没有选中实体：朝瞄点短闪到一处能站下的位置，落空挥拳。
                feet = feintLanding(world, actor, feetOrigin.plus(heading.scale(Math.min(reach, flat.length()))));
            }
            if (feet === null) { miss(action, origin); return; }

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
                    const front = body.position().minus(heading.scale(1.3)).plus(WorldCombat.point(0, 0.1, 0));
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

            if (target === null || !world.valid(target)) { miss(action, landing); return; }
            const victim = world.observe(target);
            if (victim === null) { miss(action, landing); return; }
            const landed = hurt(action, target, "feintattack", power,
                { damage: damageSpec("feintattack", "strike"), contact: true });
            const at = victim.position();
            WorldFeedback.emit(world, feintattackScene, 1, at,
                { moment: landed ? "strike" : "miss", target: String(target.ref()), decoy: decoy ? 1 : 0,
                    power: Math.round(power * 10) / 10, scale: behind / 0.85,
                    path: [[landing.x(), landing.y(), landing.z()], [at.x(), at.y(), at.z()]] }, 28);
            if (landed) {
                world.sound("cobblemon:impact.dark", at, 16, "{}");
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), feintattackStrikeText, [], 24);
            }
            done(action);
        }
    });
}
