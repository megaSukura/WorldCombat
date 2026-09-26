/**
 * 上菜 / orderup 的出手方式。
 *
 * 核心念头：小伙伴给出指令，使用者端出一记短程平抛的龙形菜势；首接触结算一次非接触伤害。
 *   若身边跟着一只小个子伙伴（「菜」），还会按它的样子给施法者补上一项能力——Droopy 提防御、
 *   Stretchy 提速度、其余提攻击；分餐式再把这个增益分给身旁队友。它不拆防护幕。
 * 三幕：
 *   起（windup，提交前）：托手成盘，盘中聚起一点暖光（`action.present`）。
 *   令（order）：伙伴到施法者之间亮起一道短指令线；能力只在**实际存在伙伴**时补上，补到谁就在谁身上亮出小符。
 *   端（serve → fly/hit）：提交后从身体平抛出一枚托盘形龙气，沿瞄准方向短程飞出；首个接触的身体结算一次
 *       非接触伤害后菜势收掉；没碰到人则原地散掉。空点也能出手，增益照旧由真实伙伴决定。
 *
 * 瞄准：`kind: "aim"` 接受任意阵营实体或世界点；不破坏方块，也不拆防护幕。
 * 与同族分开：劈瓦是竖直刀痕的贴身快劈；精神之牙只在第一处身体或屏障上闭合一次；怒牛是整段位移的冲撞。
 */
namespace PokemonSkills {
    const orderupScene = "world_combat:move_orderup";
    const orderupDishText = "world_combat.move.orderup.text.dish";
    const orderupMissText = "world_combat.move.orderup.text.miss";

    /** 「菜」：自身 dishRange 内、比自身明显小的友方里最小的一只。 */
    function orderupDish(world: CombatWorld, actor: CombatActor, self: CombatObservation, range: number): CombatActor | null {
        const actors = world.query(self.position(), range, false);
        let best: CombatActor | null = null, bestWidth = Infinity;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (!other || !world.valid(other) || String(other.key()) === String(actor.key())) continue;
            if (!world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.width() > self.width() * 0.75) continue;
            if (body.width() < bestWidth) { bestWidth = body.width(); best = other; }
        }
        return best;
    }
    /** 按「菜」的样子决定提升的能力：Droopy 防御、Stretchy 速度、其余攻击。 */
    function orderupDishStat(dish: CombatActor): string {
        if (String(dish.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(dish);
            if (typeof pokemon.aspect === "function") {
                if (pokemon.aspect("droopy")) return "def";
                if (pokemon.aspect("stretchy")) return "spe";
            }
            const form = String(pokemon.form()).toLowerCase();
            if (form.indexOf("droopy") >= 0) return "def";
            if (form.indexOf("stretchy") >= 0) return "spe";
        }
        return "atk";
    }
    function orderupStatIndex(stat: string): number { return stat === "def" ? 1 : stat === "spe" ? 2 : 0; }

    define({
        freeMovement: true,
        id: "orderup",
        cooldownParameter: "recharge",
        name: "上菜",
        description: "小伙伴给出指令，使用者端出一记短程平抛的龙形菜势：首个碰到的身体结算一次非接触伤害。身边带着小个子伙伴时，还会按它的样子给自身（分餐式再给身旁队友）补上一项能力；不拆防护幕，空放也能靠真实伙伴上菜。",
        uses: ["一记短程抛出的龙形菜势", "带着小个子伙伴时顺手强化自身", "用同一份上菜同时打开攻击与增益"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.4,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 28,
        style: "serve",
        defaults: { share: false, ai: { maxChase: 8, serve: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("orderup", "reach", pokemon) : 3, geometry: "line", style: "serve",
                color: 0xF0C86A, label: config && config.share ? "分餐式" : "独享式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["orderup"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("orderup", "tempo", context))),
                recover: Math.max(2, Math.round(p("orderup", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("orderup", "recharge", context))),
                range: p("orderup", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_orderup:windup", orderupScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", share: config && config.share ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const share = !!(config && config.share);
            const direction = aim(action);
            const reach = p("orderup", "reach", action);
            const width = p("orderup", "serveWidth", action);
            const power = p("orderup", "serve", action);
            const flight = p("orderup", "flight", action);
            const range = p("orderup", "dishRange", action);
            const shareRadius = p("orderup", "shareRadius", action);
            const stages = Math.max(1, Math.round(p("orderup", "serveStages", action)));
            const scale = width / 0.45;
            const scenes = WorldFeedback.actionScenes(orderupScene);
            let settled = false;

            function finish(current: CombatAction): void { scenes.finish(current, done); }

            function present(current: CombatAction, key: string, point: CombatPoint, data: any): void {
                scenes.show(current, key, point, data);
            }
            function orderAndDish(current: CombatAction, self: CombatObservation): boolean {
                const scope = current.world();
                const dish = orderupDish(scope, current.actor(), self, range);
                if (dish === null) return false;
                const dishBody = scope.observe(dish);
                if (dishBody === null) return false;
                const stat = orderupDishStat(dish);
                const caster = self.position();
                present(current, "order", dishBody.position(), {
                    moment: "order",
                    path: [[dishBody.position().x(), dishBody.position().y(), dishBody.position().z()],
                        [caster.x(), caster.y(), caster.z()]],
                    direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale
                });
                const selfStages = share ? stages : stages + 1;
                NativeEffects.boost(scope, current.actor(), stat, selfStages);
                WorldFeedback.emit(scope, orderupScene, 1, caster,
                    { moment: "dish", stat: orderupStatIndex(stat), stages: selfStages, target: String(current.actor().ref()), scale: scale }, 30);
                WorldFeedback.text(scope, caster.plus(WorldCombat.point(0, 1.3, 0)), orderupDishText, [selfStages], 32);
                if (share) {
                    const allies = scope.query(caster, shareRadius, false);
                    let served = 0;
                    for (let i = 0; i < allies.length && served < 4; i++) {
                        const other = allies[i];
                        if (!other || !scope.valid(other) || String(other.key()) === String(current.actor().key())) continue;
                        if (!scope.friendly(other)) continue;
                        NativeEffects.boost(scope, other, stat, stages);
                        const body = scope.observe(other);
                        if (body !== null) {
                            WorldFeedback.emit(scope, orderupScene, 1, body.position(),
                                { moment: "dish", stat: orderupStatIndex(stat), stages: stages, target: String(other.ref()), scale: scale }, 28);
                        }
                        served++;
                    }
                }
                sound(current, "minecraft:block.note_block.bell");
                return true;
            }
            function launch(current: CombatAction): void {
                const scope = current.world();
                const radius = Math.max(0.25, width * 0.7);
                const shot = LivingActions.projectile(current, {
                    speed: flight, range: reach, radius: radius, gravity: 0.03, lifetime: 80,
                    appearance: { item: "minecraft:bowl", glow: true, scale: Math.max(0.6, Math.min(1.3, width / 0.6)),
                        tint: 0xF0C86A },
                    impact: function (inner: CombatAction, contact: CombatImpact) {
                        if (settled) return;
                        const live = inner.world(), victim = contact.target(), point = contact.position();
                        if (victim === null || !live.valid(victim) || live.friendly(victim)) return;
                        settled = true;
                        const landed = impact(inner, contact, "orderup", power,
                            { damage: damageSpec("orderup", "serve") });
                        WorldFeedback.emit(live, orderupScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), power: Math.round(power), scale: scale }, 24);
                        if (landed) sound(inner, "minecraft:block.bell.use");
                    }
                }, function (inner: CombatAction) {
                    if (!settled) {
                        settled = true;
                        const live = inner.world(), body = live.observe(inner.actor());
                        if (body !== null) {
                            WorldFeedback.emit(live, orderupScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                            WorldFeedback.text(live, body.position().plus(WorldCombat.point(0, 1.0, 0)), orderupMissText, [], 20);
                        }
                    }
                    scenes.stop(inner, "fly");
                    finish(inner);
                });
                present(current, "fly", current.origin(), { moment: "fly", projectile: shot, scale: scale, power: Math.round(power) });
                sound(current, "minecraft:item.trident.throw");
            }

            const self = world.observe(actor);
            if (self !== null && orderAndDish(action, self)) {
                action.after(5, function (next: CombatAction) {
                    scenes.stop(next, "order");
                    if (!settled) launch(next);
                });
            } else {
                launch(action);
            }
        }
    });
}
