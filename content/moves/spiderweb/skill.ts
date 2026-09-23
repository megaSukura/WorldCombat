/**
 * 蛛网 / spiderweb — 执行组织。
 *
 * 核心念头：**吐一团黏丝把目标裹成茧，一层一层加上去，直到它连一步都挪不动——但火一燎就全烧开。**
 *
 * 三幕：
 *   起（windup，提交前）：丝在口边聚成一团（只观察与预告）。
 *   射（shot → wrap，提交后）：黏丝沿直线飞出；命中活体即裹身：
 *       层数 = min(上限, 目标当前层数 + 1)，时长 = 第一层时长 + (层数 − 1) × 每层增量；
 *       挂共享身份 `world_combat:status/trapped` 的 `world_combat:spiderweb_wrapped`（层数记在增幅等级里），
 *       并由随动作存亡的 `world_combat:spiderweb_cocoon` 每几刻把丝网续期、在丝松脱或被烧开时精确移除状态。
 *       同一目标再中一次先拆旧茧，避免旧茧的结束把新层清掉。
 *   收（burn / fade）：被任何火属性伤害或身上的火点着时，整圈丝一次烧光（burn）；否则时长走完自己松脱（fade）。
 *
 * 与同族分开：挡路在目标背后立实墙、黑色目光靠术者站在原地维持；蛛网缠在目标身上、术者可以走开，但怕火。
 *
 * 配置 `thick`（厚茧）由 resolve 改时序与射程，由公式改层数／时长／丝道：缠得更厚但更慢更费。
 */
namespace PokemonSkills {
    const spiderwebId = "spiderweb";
    const spiderwebScene = "world_combat:move_spiderweb";
    const spiderwebWrapped = "world_combat:spiderweb_wrapped";
    const spiderwebCocoon = "world_combat:spiderweb_cocoon";
    const spiderwebKey = "spiderweb:cocoon:";
    const spiderwebSlowFallback = 0.34;
    const spiderwebWrapText = "world_combat.move.spiderweb.text.wrap";
    const spiderwebBurnText = "world_combat.move.spiderweb.text.burn";
    const spiderwebFadeText = "world_combat.move.spiderweb.text.fade";

    function spiderwebCocoonData(json: string): string {
        const value = JSON.parse(json);
        ["layers", "threads", "scale", "slow"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid spider web state");
        });
        return JSON.stringify(value);
    }

    function spiderwebVisual(world: CombatWorld, victim: CombatActor, data: any, ticks: number): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, spiderwebKey + String(victim.ref()), spiderwebScene, 1, body.position(),
            { moment: "cocoon", target: String(victim.ref()), layers: data.layers, threads: data.threads,
                scale: data.scale, intensity: Math.max(0.6, Math.min(2.4, 0.7 + data.layers * 0.4)) }, ticks);
    }

    /** 找到目标的茧并取它这一次的每层减速；没有茧时用兜底值。 */
    function spiderwebSlow(world: CombatWorld, victim: CombatActor): number {
        const cocoons = world.effects(victim, spiderwebCocoon);
        for (let i = 0; i < cocoons.length; i++) {
            try {
                const state = JSON.parse(String(cocoons[i].data()));
                if (state && typeof state.slow === "number" && isFinite(state.slow)) return state.slow;
            } catch (error) { }
        }
        return spiderwebSlowFallback;
    }

    WorldCombat.effect(spiderwebCocoon, 1, 600, "actor", spiderwebCocoonData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spiderwebCocoon, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        spiderwebVisual(world, victim, JSON.parse(effect.state()), 40);
        effect.schedule("weave", "weave", 4, "{}");
    });
    WorldCombat.effectHandler(spiderwebCocoon, "weave", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        spiderwebVisual(world, victim, JSON.parse(effect.state()), 40);
        effect.schedule("weave", "weave", 4, "{}");
    });
    // 同一目标再中一次：旧茧先让位，避免它到点时把新层一起清掉。
    WorldCombat.effectHandler(spiderwebCocoon, "operation:world_combat:spiderweb/replace", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const state = JSON.parse(effect.state());
        state.replaced = true; effect.state(JSON.stringify(state));
        effect.end();
    });
    // 火一燎就把整圈丝烧开：由 damage_applied 监听触发，触发者不是施法者，因此不校验归属。
    WorldCombat.effectHandler(spiderwebCocoon, "operation:world_combat:spiderweb/burn", function (effect) {
        const state = JSON.parse(effect.state());
        state.burned = true; effect.state(JSON.stringify(state));
        effect.end();
    });
    WorldCombat.effectHandler(spiderwebCocoon, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        const state = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const web = MobEffects.read(world, victim, spiderwebWrapped);
            if (web !== null) world.removeMobEffect(victim, spiderwebWrapped, web.key());
        }
        if (state.replaced || !world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        const at = body.position();
        if (state.burned) {
            WorldFeedback.emit(world, spiderwebScene, 1, at, { moment: "burn", target: String(victim.ref()), layers: state.layers }, 24);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), spiderwebBurnText, [], 26);
            world.sound("minecraft:block.fire.extinguish", at, 12, "{}");
        }
        else {
            WorldFeedback.emit(world, spiderwebScene, 1, at, { moment: "fade", target: String(victim.ref()), layers: state.layers }, 24);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), spiderwebFadeText, [], 24);
        }
    });

    // 层数越多越难走：导航速度按层数线性压下去，三层以上归零（完全钉住）。
    WorldCombat.on("world_combat:move_spiderweb/weave", "world_combat:navigate", "", function (event) {
        const world = event.world(), actor = event.actor();
        const web = MobEffects.read(world, actor, spiderwebWrapped);
        if (web === null) return;
        const factor = Math.max(0, 1 - (web.amplifier() + 1) * spiderwebSlow(world, actor));
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * factor);
        event.data(JSON.stringify(data));
    });

    // 火属性伤害或身上的火：把目标的丝一次烧光（别的来源的 trapped 不动）。
    WorldCombat.on("world_combat:move_spiderweb/burn", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), target = event.target();
        if (target === null || !world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        const fire = data.type === "fire"
            || ["inFire", "onFire", "lava", "hotFloor", "fireball", "unattributedFireball", "campfire"].indexOf(String(data.cause || "")) >= 0;
        if (!fire || MobEffects.read(world, target, spiderwebWrapped) === null) return;
        const cocoons = world.effects(target, spiderwebCocoon);
        for (let i = 0; i < cocoons.length; i++) {
            if (world.operation(cocoons[i].id(), "world_combat:spiderweb/burn", "{}")) return;
        }
        const web = MobEffects.read(world, target, spiderwebWrapped);
        if (web !== null) world.removeMobEffect(target, spiderwebWrapped, web.key());
    });

    define({
        id: spiderwebId,
        cooldownParameter: "recharge",
        name: "蛛网",
        description: "吐一团黏糊糊的细丝射向一个对手，命中后把它裹成茧；同一目标再中一次就多缠一层，裹得更久、更走不动，三层以上完全钉住。术者可以走开，但任何火焰都会把整圈丝一次烧光。",
        uses: ["把想逃跑的目标一层层裹住等队友收", "缠住一个高机动目标不让它脱离", "接在队友的火招之前，逼对手先解网"],
        kind: "enemy",
        range: 7,
        maxRange: 10,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "silk",
        defaults: { thick: false, ai: { maxChase: 10, catchRunners: true, leaveStation: false } },
        fields: [
            flag("thick", "厚茧")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[spiderwebId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(spiderwebId, "tempo", context)),
                recover: Math.round(p(spiderwebId, "aftercast", context)),
                cooldown: Math.round(p(spiderwebId, "recharge", context)),
                active: 1,
                range: p(spiderwebId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_spiderweb:windup", spiderwebScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: config && config.thick === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(spiderwebId, "reach"), geometry: "line", style: "silk", color: 0xE6E2D6,
                label: config && config.thick === true ? "蛛网·厚茧" : "蛛网" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.5, p(spiderwebId, "globSpeed", action));
            const radius = Math.max(0.15, p(spiderwebId, "globRadius", action));
            const reach = Math.max(2, p(spiderwebId, "reach", action));
            const wrapTicks = Math.max(40, Math.round(p(spiderwebId, "wrapTicks", action)));
            const layerBonus = Math.max(0, Math.round(p(spiderwebId, "layerBonus", action)));
            const layerCap = Math.max(1, Math.round(p(spiderwebId, "layerCap", action)));
            const threads = Math.max(6, Math.round(p(spiderwebId, "threads", action)));
            const slow = Math.max(0.05, Math.min(0.9, p(spiderwebId, "slow", action)));
            const splat = Math.max(0.4, p(spiderwebId, "splat", action));
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 裹身：加一层、续时长、起茧；火会把整圈烧开。 */
            function wrap(current: CombatAction, victim: CombatActor): void {
                const scope = current.world();
                const existing = MobEffects.read(scope, victim, spiderwebWrapped);
                const held = existing === null ? 0 : existing.amplifier() + 1;
                const layers = Math.min(layerCap, held + 1);
                const ticks = Math.max(40, Math.round(wrapTicks + (layers - 1) * layerBonus));
                const cocoons = scope.effects(victim, spiderwebCocoon);
                for (let i = 0; i < cocoons.length; i++) scope.operation(cocoons[i].id(), "world_combat:spiderweb/replace", "{}");
                MobEffects.apply(scope, victim, spiderwebWrapped, ticks, layers - 1);
                const body = scope.observe(victim);
                const scale = body === null ? 1 : Math.max(0.6, Math.min(2.4, body.width() / 0.9));
                const data = { layers: layers, threads: threads, scale: scale, slow: slow };
                current.effect(spiderwebCocoon, victim, JSON.stringify(data), ticks);
                WorldFeedback.emit(scope, spiderwebScene, 1, body === null ? current.targetPosition() : body.position(),
                    { moment: "wrap", target: String(victim.ref()), layers: layers, threads: threads,
                        scale: scale, intensity: Math.max(0.6, Math.min(2.4, 0.7 + layers * 0.4)) }, 30);
                WorldFeedback.text(scope, (body === null ? current.targetPosition() : body.position()).plus(WorldCombat.point(0, 1.1, 0)),
                    spiderwebWrapText, [layers, Math.round(ticks / 20 * 10) / 10], 30);
                scope.sound("minecraft:block.cobweb.place", body === null ? current.targetPosition() : body.position(), 14, "{}");
            }

            sound(action, "minecraft:block.tripwire.attach");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, lifetime: Math.max(40, Math.round(reach / Math.max(0.2, speed) + 30)),
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.8, tint: 0xEDE8F0 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck) && !scope.friendly(struck)) { wrap(current, struck); return; }
                    WorldFeedback.emit(scope, spiderwebScene, 1, hit.position(),
                        { moment: "splat", scale: splat / 0.8, laid: 0 }, 20);
                    scope.sound("minecraft:block.cobweb.break", hit.position(), 12, "{}");
                }
            }, function (current: CombatAction) {
                WorldFeedback.emit(current.world(), spiderwebScene, 1, current.targetPosition(), { moment: "splat", scale: splat / 0.8 }, 18);
                finish(current);
            });
            WorldFeedback.emit(world, spiderwebScene, 1, action.origin(),
                { moment: "shot", projectile: flight, target: targetRef, threads: threads }, 40);
        }
    });
}
