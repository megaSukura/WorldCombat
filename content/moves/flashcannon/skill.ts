/**
 * 加农光炮 / flashcannon —— 注册与动作。
 *
 * 三幕：
 *   聚（converge，提交前）：全身的光被收进身前后一点、越收越亮（`action.present` 预告）。
 *   射（lance，提交后）：一条高速光矛沿准线射出（画面是一条细长光杆，沿真实速度 orient）；命中活物时结算一次
 *       特殊伤害，并按 `pierce` 继续穿过后面的目标，每穿过一人威力按 `falloff` 衰减、光杆暗一分；按概率用共享
 *       `NativeEffects.boost(..., "spd", -1)` 压低特防。
 *   散（shatter）：撞上墙时在墙面炸成一片平面光屑。
 *
 * 选取 `kind: "aim"`——自由方向或点都能放，也可瞄实体；实体按 `pierce` 穿透，墙阻挡，不自动转向。
 * 与同族分开：磨防远击四式里唯一命中 100、不偏线、能一发贯穿一条线上多人的那个；单发最轻，且被墙挡住。
 * 配置 `focus`（集束）由 resolve 改时序、由公式改威力／贯穿数。
 */
namespace PokemonSkills {
    const flashcannonScene = "world_combat:move_flashcannon";
    const flashcannonSunderText = "world_combat.move.flashcannon.text.sunder";

    /** 撞墙端点：把原生方块面换成外法线，供表现的平面光屑贴面朝向。 */
    function flashcannonNormal(face: string): number[] {
        if (face === "down") return [0, -1, 0];
        if (face === "up") return [0, 1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return [0, 1, 0];
    }

    define({
        id: "flashcannon",
        name: "Flash Cannon",
        description: "朝方向或点把全身的光收进一点、射出一条高速光矛：命中第一个敌人造成特殊伤害，并可贯穿直线上的后续目标（逐个变暗、逐个衰减）；可能把每个命中目标的特防压低 1 级。被墙挡住，撞墙散成一片光屑。",
        uses: ["一发扫掉排成一条线的敌人", "穿透并逐个压低沿线目标的特防", "中远距离的高精度单体射杀", "朝空处试射，光矛散在墙上"],
        kind: "aim",
        range: 14,
        maxRange: 20,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 32,
        style: "beam",
        defaults: { focus: false, ai: { maxChase: 16, lineUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flashcannon", "reach", pokemon), geometry: "line", style: "beam",
                color: 0xBFE8FF, label: config && config.focus === true ? "集束加农光炮" : "贯穿加农光炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flashcannon"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p("flashcannon", "converge", context)),
                recover: 10,
                cooldown: 32 + (focus ? -3 : 3),
                active: 0,
                range: p("flashcannon", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:flashcannon:" + action.id(), flashcannonScene, 1, action.origin(),
                JSON.stringify({ moment: "converge", beams: Math.round(p("flashcannon", "beams", action)),
                    focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(flashcannonScene);
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const power = p("flashcannon", "core", action);
            const falloff = p("flashcannon", "falloff", action);
            const pierce = Math.max(0, Math.round(p("flashcannon", "pierce", action)));
            const speed = p("flashcannon", "velocity", action);
            const radius = p("flashcannon", "radius", action);
            const chance = p("flashcannon", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("flashcannon", "sunderStage", action)));
            const beams = Math.max(14, Math.round(p("flashcannon", "beams", action)));
            const scale = Math.max(0.5, Math.min(2.4, power / 80));
            const heading = [direction.x(), direction.y(), direction.z()];
            let index = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "minecraft:block.beacon.activate");
            // 发射口：光矛离手的一下压缩闪光。
            WorldFeedback.emit(world, flashcannonScene, 1, origin,
                { moment: "muzzle", direction: heading, beams: beams, scale: scale }, 14);

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction,
                lifetime: Math.max(24, Math.round(action.range() / Math.max(0.2, speed) + 16)),
                // 判定半径不变；圆球外观交给表现里的细长光杆，弹体本身保持隐藏。
                appearance: { pierce: pierce },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const cell = hit.blockPosition();
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        // 撞墙/空放：光杆到此结束，在原生方块面散成一片平面光屑。
                        scenes.stop(current, "lance");
                        const at = cell !== null ? cell : hit.position();
                        WorldFeedback.emit(scope, flashcannonScene, 1, at,
                            { moment: "shatter", point: [at.x(), at.y(), at.z()], direction: flashcannonNormal(hit.blockFace()),
                                beams: beams, scale: scale }, 20);
                        sound(current, "minecraft:block.beacon.deactivate");
                        return;
                    }
                    const shot = Math.max(1, power * Math.pow(falloff, index));
                    index++;
                    const landed = impact(current, hit, "flashcannon", shot, { damage: damageSpec("flashcannon", "core") });
                    if (!landed) return;
                    hits++;
                    // 每穿一人光杆按这一次实际威力暗一分；同 key 更新，不另起一道。
                    scenes.show(current, "lance", origin,
                        { moment: "lance", projectile: flight, direction: heading, beams: beams, scale: scale,
                            intensity: Math.max(0.4, Math.min(2.2, shot / 80)), index: index });
                    WorldFeedback.emit(scope, flashcannonScene, 1, hit.position(),
                        { moment: "hit", target: String(victim.ref()), beams: beams, scale: scale,
                            intensity: Math.max(0.5, Math.min(2.2, shot / 80)), index: index }, 24);
                    sound(current, "cobblemon:impact.steel");
                    if (scope.valid(victim) && scope.random() < chance) {
                        NativeEffects.boost(scope, victim, "spd", -stages);
                        const at = scope.observe(victim);
                        if (at !== null)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), flashcannonSunderText, [stages], 30);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            scenes.show(action, "lance", origin,
                { moment: "lance", projectile: flight, direction: heading, beams: beams, scale: scale,
                    intensity: Math.max(0.5, Math.min(2.2, power / 80)), index: 0 });
        }
    });
}
