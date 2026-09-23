/**
 * 臂贝武器 / shellsidearm —— 出手方式。
 *
 * 核心念头：一发**瞄准对方软肋的毒壳重炮**。施法者把带毒的壳压进发射腔，发射前先看清对方哪一面软：
 *   硬壳目标吃**钝击**（物理），软肉目标吃**毒液喷射**（特殊）。同一发弹、同一份威力，用哪一面打由命中时的对比决定。
 *
 * 幕：
 *   起（windup，提交前）：把毒壳压进发射腔、毒气从缝里冒出的预告（`action.present`，可被打断、不花 PP）。
 *   发（fire）：提交后确定这一发用哪一面，毒壳脱膛飞出，拖一条厚尾。
 *   中（ram / spray / whiff）：命中处按这一面炸开钝击的壳屑或喷射的毒云，结算 `power` 物理或特殊伤害；
 *       钝击式还会贴身接触对手；随后按概率让目标中毒。命中墙或无人只播落空。
 *
 * 分裂方式：伤害段的 `category` 不在定义里写死，而在 `execute` 里按同一份比较决定，再作为本次伤害的 features 传入，
 *   所以**画面演的那一面就是真正结算的那一面**。悬浮在无目标时按原生特殊预估，说明里写明实际由命中对比决定。
 *
 * 配置 `form`（发射形态）：
 *   0 自动（默认）：射程照公式，命中时自动挑伤害更高的一面；
 *   1 钝击：强制物理、接触、威力 ×1.05，但射程 ×0.5、弹速 ×0.85、起手 +2、冷却 +4；
 *   2 喷射：强制特殊、射程 ×1.15、弹速 ×1.15，但威力 ×0.95。
 */
namespace PokemonSkills {
    const shellsidearmScene = "world_combat:move_shellsidearm";
    const shellsidearmVenomText = "world_combat.move.shellsidearm.text.venom";
    const shellsidearmImmuneText = "world_combat.move.shellsidearm.text.immune";
    const shellsidearmWhiffText = "world_combat.move.shellsidearm.text.whiff";

    /**
     * 这一发该用哪一面：钝击（物理）与喷射（特殊）各按对手的物防/特防比一比，取伤害更高的一面；
     * 无目标时退回个体自身的物特差。与命中结算共用同一组事实，因此执行与画面一致。
     */
    function shellsidearmPhysical(action: CombatAction): boolean {
        const world = action.world();
        const target = action.target();
        if (target === null || !world.valid(target)) return p("shellsidearm", "edge", action) > 0;
        const me = PokemonDamage.combatants.read(world, action.actor());
        const you = PokemonDamage.combatants.read(world, target);
        const spec = damageSpec("shellsidearm", "power");
        const power = Math.max(1, p("shellsidearm", "power", action));
        const physical = CombatantStats.calculate(power, me.stats.atk || 0, CombatantStats.defence(you, "def"), spec).amount;
        const special = CombatantStats.calculate(power, me.stats.spa || 0, CombatantStats.defence(you, "spd"), spec).amount;
        if (physical > special) return true;
        if (special > physical) return false;
        return world.random() < 0.5;
    }

    define({
        id: "shellsidearm",
        cooldownParameter: "recharge",
        name: "Shell Side Arm",
        description: "把带毒的壳压进发射腔射出去，发射前先看清对方哪一面软：硬壳目标吃钝击（物理），软肉目标吃毒液喷射（特殊）。命中后按概率让目标中毒。可以固定用钝击（更狠但必须贴脸）或喷射（更远更稳）。",
        uses: ["对软肋不明的目标打最高伤害", "远距离的一记毒壳重炮", "切进钝击模式贴脸爆发"],
        kind: "enemy",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 2,
        recover: 9,
        cooldown: 34,
        style: "shell",
        defaults: { form: 0, ai: { maxChase: 18, finishLow: true, longShot: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shellsidearm"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shellsidearm", "charge", context)),
                recover: Math.round(p("shellsidearm", "settle", context)),
                cooldown: Math.round(p("shellsidearm", "recharge", context)),
                active: 2,
                range: p("shellsidearm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const cloud = Math.max(6, Math.round(p("shellsidearm", "venomCloud", action)));
            const form = config && typeof config.form === "number" ? config.form : 0;
            action.present("shellsidearm:charge:" + action.id(), shellsidearmScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, cloud: cloud, form: form }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["shellsidearm"], detail: { values: config } };
            const form = config && typeof config.form === "number" ? config.form : 0;
            return { radius: p("shellsidearm", "reach", context), geometry: "line", style: "shell", color: 0x8A6BA8,
                label: form === 1 ? "臂贝武器·钝击" : form === 2 ? "臂贝武器·喷射" : "臂贝武器" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const direction = aim(action);
            const form = config && typeof config.form === "number" ? config.form : 0;
            const physical = form === 1 ? true : form === 2 ? false : shellsidearmPhysical(action);
            const category = physical ? "physical" : "special";
            const power = p("shellsidearm", "power", action);
            const speed = p("shellsidearm", "shellSpeed", action);
            const radius = p("shellsidearm", "shellRadius", action);
            const chance = p("shellsidearm", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("shellsidearm", "venomTicks", action)));
            const cloud = Math.max(8, Math.round(p("shellsidearm", "venomCloud", action)));
            const scale = Math.max(0.6, Math.min(2, radius / 0.3));
            const intensity = Math.max(0.6, Math.min(2, power / 90));
            let ref = target !== null && world.valid(target) ? String(target.ref()) : "";
            const appearance: any = { sprite: physical ? "cobblemon:generic/goo/chemicalball" : "cobblemon:generic/orb/orb",
                tint: physical ? 0x8A6BA8 : 0x9BE86B, glow: true, scale: Math.max(0.9, radius / 0.3) };
            if (ref) appearance.homing = { target: ref, turn: physical ? 20 : 12, range: action.range() };
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, shellsidearmScene, 1, action.origin(),
                { moment: "fire", direction: [direction.x(), direction.y(), direction.z()], cloud: cloud,
                    scale: scale, intensity: intensity, physical: physical ? 1 : 0 }, 22);
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    struck = true;
                    const scope = current.world();
                    const victim = hit.target();
                    const point = hit.position();
                    let poisoned = false;
                    if (victim !== null && scope.valid(victim)) {
                        ref = String(victim.ref());
                        const dealt = impact(current, hit, "shellsidearm", power,
                            { damage: damageSpec("shellsidearm", "power"), category: category, contact: physical });
                        if (!dealt) {
                            const at = scope.observe(victim);
                            if (at !== null) WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), shellsidearmImmuneText, [], 22);
                        }
                        if (dealt && scope.valid(victim) && scope.random() < chance)
                            poisoned = CombatStatus.inflict(scope, victim, "poison", venomTicks, 0, { secondary: true });
                    }
                    WorldFeedback.emit(scope, shellsidearmScene, 1, point,
                        { moment: physical ? "ram" : "spray", target: ref, cloud: cloud, projectile: flight,
                            scale: scale, intensity: intensity }, 30);
                    if (poisoned) {
                        const at = scope.observe(victim!);
                        if (at !== null) WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), shellsidearmVenomText, [], 26);
                        scope.sound("cobblemon:impact.poison", point, 16, "{}");
                    }
                    if (physical) scope.sound("minecraft:entity.generic.explode", point, 18, "{}");
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    WorldFeedback.emit(current.world(), shellsidearmScene, 1, current.targetPosition(),
                        { moment: "whiff", cloud: Math.round(cloud * 0.5), scale: scale }, 18);
                    WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.5, 0)), shellsidearmWhiffText, [], 18);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "shellsidearm:shell:" + action.id(), shellsidearmScene, 1, action.origin(),
                { moment: "shell", projectile: flight, cloud: cloud, scale: scale, intensity: intensity }, 120);
        }
    });
}
