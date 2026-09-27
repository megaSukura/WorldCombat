/** worryseed：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const worryseedScene = "world_combat:move_worryseed";
    export const worryseedMark = "world_combat:worryseed";
    export const worryseedAura = "world_combat:worryseed_sprout";
    export const worryseedPlantText = "world_combat.move.worryseed.text.planted";
    export const worryseedWokeText = "world_combat.move.worryseed.text.woken";

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function worryseedAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        return NativeEffects.ability(pokemon, state);
    }

    /**
     * 这颗种子还能不能顶掉目标的特性：读得出、不是不眠、不是天生免疫睡眠，且允许被压制。
     * 不可替换与已不眠都沿用原生拒绝，不虚构一次成功。
     */
    export function worryseedPlantable(ability: string): boolean {
        return !!ability && ability !== "insomnia"
            && !NativeAbilities.flag(ability, "cantsuppress") && !NativeAbilities.flag(ability, "statusImmune");
    }

    // 敌方特性值不值得顶替：负面特性顶掉反而帮了对手，必须先排除；再优先拆掉真正难缠的强特性。
    var worryseedLiabilities = ["truant", "slowstart", "defeatist", "klutz", "cacophony", "normalize", "stall"];
    var worryseedTrouble = ["wonderguard", "multiscale", "magicguard", "intimidate", "levitate", "flashfire", "waterabsorb",
        "voltabsorb", "sapsipper", "sturdy", "disguise", "thickfat", "filter", "regenerator", "immunity", "hydration", "overcoat"];
    export function worryseedLiability(ability: string): boolean { return worryseedLiabilities.indexOf(ability) >= 0; }
    export function worryseedWorthReplacing(ability: string): boolean { return worryseedTrouble.indexOf(ability) >= 0; }

    // 烦恼顶芽：锚到真实的 worryseed 载体上，只要标记还在就维持；标记被清除/替换/到期时自己收掉。
    WorldCombat.effect(worryseedAura, 1, 1400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string") throw new Error("Invalid worry seed sprout: target");
        if (typeof value.carrier !== "string" || !value.carrier) throw new Error("Invalid worry seed sprout: carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function worryseedSproutShow(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, worryseedMark);
        if (carrier === null || String(carrier.key()) !== String(data.carrier)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "sprout", worryseedScene, 1, body.position(),
            { moment: "sprout", target: String(target.ref()), leaves: Math.max(4, Math.round(Number(data.leaves) || 6)),
                sprout: Math.max(0.12, Number(data.sprout) || 0.18), deep: data.deep || 0 });
    }
    WorldCombat.effectHandler(worryseedAura, "start", function (effect) {
        worryseedSproutShow(effect);
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("sprout", "sprout", 20, "{}");
    });
    // 短频率巡检：本次载体被替换/清除或目标离场，立即结束（表现随 key 一同收掉）。
    WorldCombat.effectHandler(worryseedAura, "watch", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, worryseedMark);
        if (carrier === null || String(carrier.key()) !== String(data.carrier)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(worryseedAura, "sprout", function (effect) {
        worryseedSproutShow(effect);
        effect.schedule("sprout", "sprout", 20, "{}");
    });
    WorldCombat.effectHandler(worryseedAura, "end", function (effect) {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) return;
        const data = JSON.parse(effect.state());
        // 只有标记真的不在了才报脱落；被同一招刷新替换时不报，新芽接上。
        if (MobEffects.read(world, target, worryseedMark) !== null) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, worryseedScene, 1, body.position(), { moment: "shed", target: String(target.ref()) }, 22);
    });
    WorldCombat.effectHandler(worryseedAura, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function worryseedClearSprout(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, worryseedAura);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }

    define({
        id: "worryseed",
        cooldownParameter: "recharge",
        name: "Worry Seed",
        description: "投出一颗烦恼种子：命中敌人时把它的特性暂时换成不眠、并叫醒它；命中睡着的友方会把它叫醒，种子存续期间两者都抵抗再次催眠。友方不改变特性。可以空投，落到地面就散开。",
        uses: ["顶掉对手的强力特性换成一枚不眠", "把睡着的伙伴叫醒，并替它挡住之后的催眠", "让对手睡不下去，封掉催眠类打法"],
        kind: "aim",
        range: 7,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 70,
        style: "seed",
        defaults: { deep: false, helpFriends: true, ai: { maxChase: 13, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["worryseed"], detail: { values: config } };
            return { radius: p("worryseed", "reach", context), geometry: "line", style: "seed", color: 0x8FBF4A, label: "烦恼种子" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["worryseed"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("worryseed", "tempo", context)),
                recover: Math.round(p("worryseed", "aftercast", context)),
                cooldown: Math.round(p("worryseed", "recharge", context)) + (deep ? 20 : -12),
                active: 0,
                range: p("worryseed", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target(), origin = action.origin();
            const self = world.observe(action.actor());
            // 种子从真实出手点（身体上方）出发，射程与视线都与 execute 的 muzzle 一致。
            const from = self === null ? origin : self.position().plus(WorldCombat.point(0, self.height() * 0.55, 0));
            // 空投：只朝一个世界点运种，能落到射程内就允许；没有实体也不额外找敌人。
            if (target === null) return action.targetPosition().minus(from).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(from).length() > action.range()) return "out-of-range";
            if (!world.clear(from, body.position())) return "no-line";
            if (CombatStatus.has(world, target, "worryseed")) return "already-planted";
            // 友方只唤醒与保护，不改写特性，因此不读特性；只有敌人要换特性才做可压制预检。
            if (!world.friendly(target) && String(target.domain()) === "cobblemon") {
                const ability = worryseedAbility(world, target);
                if (ability === "insomnia") return "already-wakeful";
                if (!NativeModifiers.abilitySuppressible(world, target)) return "no-effect";
            }
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            const path = target === null ? [String(action.actor().ref())] : [String(action.actor().ref()), String(target.ref())];
            action.present("world_combat:worryseed:gather", worryseedScene, 1, action.origin(), JSON.stringify({
                moment: "gather", path: path, seeds: p("worryseed", "seeds", action), deep: config && config.deep ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const deep = !!(config && config.deep);
            const velocity = p("worryseed", "velocity", action);
            const radius = Math.max(0.15, p("worryseed", "radius", action));
            const hold = Math.max(80, Math.round(p("worryseed", "hold", action)));
            const seeds = Math.max(10, Math.round(p("worryseed", "seeds", action)));
            const worries = Math.max(4, Math.round(p("worryseed", "worries", action)));
            const roots = Math.max(6, Math.round(p("worryseed", "roots", action)));
            const sprout = Math.max(0.12, Math.round(0.18 * (deep ? 1.35 : 1) * 100) / 100);
            const chosen = target !== null && world.valid(target) ? String(target.ref()) : "";
            const chosenFriend = chosen !== "" && world.friendly(target!);
            const from = body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const aimed = action.targetPosition().minus(from);
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const scale = radius / 0.22;
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            function plant(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), hit = impact.target(), at = impact.position();
                // 只对明确选中的实体施加；空投顺路撞到敌人也算种上。撞到别的身体或方块就散开。
                const valid = hit !== null && scope.valid(hit);
                const intended = valid && chosen !== "" && String(hit!.ref()) === chosen;
                const strayEnemy = valid && chosen === "" && !scope.friendly(hit!);
                if (valid && (intended || strayEnemy)) {
                    const enemy = !scope.friendly(hit!);
                    // 只有真正的敌人要换特性；友方保留原特性，只唤醒并保护。
                    if (enemy && String(hit!.domain()) === "cobblemon" && !worryseedPlantable(worryseedAbility(scope, hit!))) {
                        WorldFeedback.emit(scope, worryseedScene, 1, at, { moment: "miss", seeds: seeds, scale: scale }, 22);
                        finish(current);
                        return;
                    }
                    // 先落真实载体；被原生拒绝时不报告种下。
                    const carrier = MobEffects.set(scope, hit!, worryseedMark, hold, deep ? 1 : 0);
                    if (carrier === null) {
                        WorldFeedback.emit(scope, worryseedScene, 1, at, { moment: "miss", seeds: seeds, scale: scale }, 22);
                        finish(current);
                        return;
                    }
                    const anchor = MobEffects.anchor(carrier);
                    if (enemy && String(hit!.domain()) === "cobblemon") {
                        const layer = NativeModifiers.apply(scope, hit!, { ability: "insomnia", carrier: anchor, source: "world_combat:worryseed" }, hold);
                        if (!layer || worryseedAbility(scope, hit!) !== "insomnia") {
                            scope.removeMobEffect(hit!, worryseedMark, anchor.key);
                            WorldFeedback.emit(scope, worryseedScene, 1, at, { moment: "miss", seeds: seeds, scale: scale }, 22);
                            finish(current); return;
                        }
                    }
                    // 先收掉旧的同源顶芽，再挂本次的；新芽认住新 key，旧清理不会误删新芽。
                    worryseedClearSprout(scope, hit!);
                    scope.effect(worryseedAura, hit!, JSON.stringify({ target: String(hit!.ref()), carrier: anchor.key,
                        leaves: worries, sprout: sprout, deep: deep ? 1 : 0 }), hold);
                    const woke = CombatStatus.has(scope, hit!, "sleep") ? CombatStatus.cure(scope, hit!, "sleep") : false;
                    const spot = scope.observe(hit!);
                    const anchorPoint = spot === null ? at : spot.position();
                    WorldFeedback.emit(scope, worryseedScene, 1, anchorPoint,
                        { moment: "plant", target: String(hit!.ref()), seeds: seeds, roots: roots,
                            deep: deep ? 1 : 0, worrySize: sprout, scale: scale }, 40);
                    if (woke)
                        WorldFeedback.emit(scope, worryseedScene, 1, anchorPoint.plus(WorldCombat.point(0, spot === null ? 1.0 : spot.height() * 0.7, 0)),
                            { moment: "wake", target: String(hit!.ref()), glints: Math.max(8, Math.round(worries * 1.5)), scale: scale }, 30);
                    WorldFeedback.text(scope, anchorPoint.plus(WorldCombat.point(0, 1.35, 0)), woke ? worryseedWokeText : worryseedPlantText, [], 40);
                    sound(current, "minecraft:block.grass.place");
                } else {
                    const wall = impact.blocked() ? impact.blockPosition() : null;
                    WorldFeedback.emit(scope, worryseedScene, 1, wall === null ? at : wall, { moment: "miss", seeds: seeds, scale: scale }, 24);
                }
                finish(current);
            }
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/grass/seed", scale: Math.max(0.6, scale), tint: 0x6E9B3A, hitAllies: chosenFriend
            };
            if (chosen !== "") appearance.homing = { target: chosen, turn: 5, delay: 1, range: action.range() };
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, lifetime: 140,
                origin: from, direction: direction, appearance: appearance, impact: plant
            }, finish);
            WorldFeedback.emit(world, worryseedScene, 1, from,
                { moment: "toss", projectile: flight, seeds: seeds, scale: scale }, 40);
            sound(action, "minecraft:entity.snowball.throw");
        }
    });
}
