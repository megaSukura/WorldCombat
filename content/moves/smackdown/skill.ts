/**
 * 击落 / smackdown 的出手方式。
 *
 * 核心念头：朝一个目标投出一支系着配重的岩弹。石头本身不重，重的是那一截配重——砸中一个离地在空的
 * 对手，就把它从天上拽到它正下方的地面、拔掉它身上的浮空身份、打断它正在进行的空中动作，并在它身上
 * 钉一段贴地身份；已经站在地上的普通对手只挨这一记石头。它是这一族「垂直轴」里的**远程防空**位：
 * 威力最低、射程最远，价值全在“把会飞的东西按回地面”这一步。
 *
 * 三幕：
 *   起（windup，提交前）：只观察与预告，可免费打断，不花 PP。
 *   飞（flight，提交后）：岩弹沿直线飞向目标，带一点追踪（turn 5°/刻，延迟 2 刻起步），拖着石屑。
 *   落（hit / drop / miss）：命中离地目标 → 拖落并钉住；命中贴地目标 → 只结算这一记；打空 → 只扬一点尘。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact → PokemonDamage）与位移（world.displace）、
 * 状态（真实的 MC MobEffect，身份 world_combat:status/smackdown）都走同一条路；只有“飞行属性/浮空特性”
 * 是宝可梦层。
 */
namespace PokemonSkills {
    const smackdownScene = "world_combat:move_smackdown";
    const smackdownPin = "world_combat:smackdown_pin";
    const smackdownHitText = "world_combat.move.smackdown.text.hit";
    const smackdownDropText = "world_combat.move.smackdown.text.drop";
    const smackdownMissText = "world_combat.move.smackdown.text.miss";

    /** 目标是否被托离地面：贴地观察、共享浮空身份，或宝可梦层的飞行属性/浮空特性。 */
    function smackdownAirborne(world: CombatWorld, actor: CombatActor): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        if (!body.grounded()) return true;
        if (CombatStatus.has(world, actor, "fly") || CombatStatus.has(world, actor, "magnetrise") || CombatStatus.has(world, actor, "telekinesis")) return true;
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
            if (NativeEffects.types(pokemon, state).indexOf("flying") >= 0) return true;
            if (String(NativeEffects.ability(pokemon, state)).indexOf("levitate") >= 0) return true;
        }
        return false;
    }

    /** 拔掉目标身上的浮空身份；返回是否拔掉了任何一样。 */
    function smackdownStrip(world: CombatWorld, actor: CombatActor): boolean {
        let removed = false;
        ["fly", "magnetrise", "telekinesis"].forEach(function (name) {
            CombatStatus.tagged(world, actor, name).forEach(function (effect) {
                if (world.removeMobEffect(actor, effect.id(), effect.key())) removed = true;
            });
        });
        return removed;
    }

    /** 目标正下方最近地表的顶面高度；找不到就返回脚底当前高度。 */
    function smackdownGroundY(world: CombatWorld, body: CombatObservation): number {
        const from = body.position(), feet = from.y() - body.height() * 0.5;
        for (let step = 0; step <= 24; step++) {
            const probe = WorldCombat.point(from.x(), feet - step, from.z());
            const block = world.block(probe);
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return Math.floor(feet - step) + 1;
        }
        return feet;
    }

    /** 把一个离地的目标拽到正下方地面、拔掉浮空身份、打断空中动作，并钉上贴地身份。 */
    function smackdownDrop(current: CombatAction, victim: CombatActor, pull: number, pinTicks: number): void {
        const world = current.world(), body = world.observe(victim);
        if (body === null) return;
        world.deliver(victim, "world_combat:interrupt");
        smackdownStrip(world, victim);
        const surface = smackdownGroundY(world, body);
        const landed = WorldCombat.point(body.position().x(), surface + body.height() * 0.5, body.position().z());
        const drop = body.position().minus(landed);
        if (drop.length() > 0.05) world.displace(victim, drop);
        if (!world.valid(victim)) return;
        MobEffects.apply(world, victim, smackdownPin, Math.max(20, pinTicks), 0);
        WorldFeedback.emit(world, smackdownScene, 1, landed,
            { moment: "drop", target: String(victim.ref()), pull: pull, scale: Math.max(0.6, Math.min(2, pull / 0.8)),
                count: Math.round(10 + pull * 8) }, 30);
    }

    define({
        id: "smackdown",
        name: "Smack Down",
        description: "朝一个目标投出系着配重的岩弹：砸中离地/会飞的对手就把它拽回地面、拔掉浮空身份并钉住一段；站在地上的普通对手只挨这一记石头。",
        uses: ["把飞在空中的对手打落地面", "打断对手的飞扑与浮空", "远距离先手砸一下"],
        kind: "enemy",
        range: 12,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "rock",
        maximumTicks: 160,
        defaults: { flyersOnly: false, ai: { maxChase: 14 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("smackdown", "collisionRadius", pokemon), geometry: "line", style: "rock", color: 0x9A8A72,
                label: config && config.flyersOnly === true ? "只打空中的" : "击落" };
        },
        windup: function (action, config) {
            action.present("smackdown:windup", smackdownScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", flyersOnly: config && config.flyersOnly === true }));
            return p("smackdown", "prepare", action);
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const origin = action.origin();
            const speed = Math.max(0.3, p("smackdown", "throwSpeed", action));
            const radius = Math.max(0.15, p("smackdown", "collisionRadius", action));
            const power = p("smackdown", "impact", action);
            const pull = Math.max(0.2, p("smackdown", "pull", action));
            const pinTicks = Math.max(20, Math.round(p("smackdown", "pinTicks", action)));
            const appearance: any = { item: "minecraft:cobblestone", scale: Math.max(0.35, Math.min(0.8, radius * 1.6)), spin: true };
            if (target !== null) appearance.homing = { target: String(target.ref()), turn: 5, delay: 2, range: action.range() + 2 };
            let settled = false, impacted = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function miss(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, smackdownScene, 1, current.targetPosition(), { moment: "miss" }, 18);
                WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 0.6, 0)), smackdownMissText, [], 20);
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range() + 3, radius: radius, lifetime: 120, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    impacted = true;
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { miss(current); finish(current); return; }
                    if (!impact(current, hit, "smackdown", power, { damage: damageSpec("smackdown", "impact") })) { finish(current); return; }
                    const airborne = smackdownAirborne(scope, victim);
                    WorldFeedback.emit(scope, smackdownScene, 1, point,
                        { moment: "hit", target: String(victim.ref()), airborne: airborne ? 1 : 0,
                            intensity: Math.max(0.5, Math.min(1.8, power / 50)), power: power, count: Math.round(24 + power * 0.45) }, 24);
                    sound(current, "cobblemon:move.rockthrow.target");
                    sound(current, "cobblemon:impact.rock");
                    if (airborne) {
                        smackdownDrop(current, victim, pull, pinTicks);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), smackdownDropText, [], 26);
                    } else {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), smackdownHitText, [], 24);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!impacted) { miss(current); finish(current); }
            });
            WorldFeedback.keep(world, "smackdown:bolt:" + action.id(), smackdownScene, 1, origin,
                { moment: "flight", projectile: flight, scale: Math.max(0.5, Math.min(1.6, radius / 0.32)) }, 120);
        }
    });

    // 贴地身份存续期：每 10 刻把目标身上新出现的浮空身份再拔掉一次，并把它按在地面上；低密度画面续期。
    WorldCombat.on("world_combat:move_smackdown/pin", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== smackdownPin) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 10 !== 0) return;
        smackdownStrip(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        if (!body.grounded()) world.motion(actor, WorldCombat.point(0, -0.5, 0), false);
        WorldFeedback.keep(world, "smackdown:pin:" + String(actor.ref()), smackdownScene, 1, body.position(),
            { moment: "pin", target: String(actor.ref()) }, 20);
    });
}
