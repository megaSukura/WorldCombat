/**
 * 粉尘 / powder —— 出手方式。
 *
 * 核心念头：朝一个方向抛出一团极细的粉尘，第一碰到的对手就被沾上；之后它自己放出火攻的那一刻，粉尘当场
 *   炸开一次，按施法者的特攻给它一记自伤。先埋一颗、等对手自己点火——它是一记陷阱，不是即时的状态投掷。
 *
 * 两幕 + 引爆：
 *   起（windup，提交前）：掌心拢起粉尘，预告这一抛（`action.present`）。
 *   撒（throw → dusted）：提交后粉团沿直线飞向瞄准点（自由 aim）；命中第一个非友方实体且它不是草属性、
 *      身上还没有粉时，就给它挂上共享身份 world_combat:status/powdered 的粉尘，并建一份属于施法者的机读 mark
 *      （写明爆炸比例 `blast`、尘粒数、判定半径与撒粉者归属），粘附 `dustTicks`；草属性、已有粉、拒粉者与落空都只散粉。
 *   爆（ignite）：此后该对手自己放出火攻时，由这份 mark 单次消费并引爆——脚本火招在提交时触发，烈焰人等原生
 *      对外火伤在真正造成第一笔时触发；火招照常放完，粉只埋一次。反噬走原生 hurt 许可、按实际扣血记账。
 *
 * 与同族分开：粉系四式（毒粉／麻痹粉／催眠粉等）都是命中即施加状态；只有粉尘是**埋在对手身上、由它自己
 * 使用火招触发的一次性陷阱**——它惩罚的是对手的招法选择，而不是它的当下。
 * 反制：不用火招就不会引爆，粉尘到期自然散去；草属性穿过粉尘；墙与落点决定粉团能不能贴上。
 */
namespace PokemonSkills {
    const powderScene = "world_combat:move_powder";
    const powderDust = "world_combat:powdered_dust";
    const powderMark = "world_combat:powder_mark";
    const powderDustText = "world_combat.move.powder.text.dust";
    const powderBlastText = "world_combat.move.powder.text.blast";
    const powderMissText = "world_combat.move.powder.text.miss";

    /** 草属性对粉末免疫：读通用战斗者当前属性（含原生层与改写），不是只读宝可梦原始类型。 */
    function powderGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return true;
        return PokemonDamage.combatants.read(world, actor).types.indexOf("grass") >= 0;
    }

    /** 有真实来源的对外火攻事实：原生火伤害标签／类型／受击原因，以及施法者脚本火招写下的 type。 */
    export function powderFire(data: any): boolean {
        const tags: string[] = data && data.damageTags ? data.damageTags : [];
        if (tags.indexOf("minecraft:is_fire") >= 0 || tags.indexOf("neoforge:is_fire") >= 0) return true;
        if (String(data && data.type) === "fire") return true;
        const type = String(data && data.damageType || "");
        if (["minecraft:in_fire", "minecraft:on_fire", "minecraft:lava", "minecraft:hot_floor", "minecraft:campfire",
            "minecraft:fireball", "minecraft:unattributed_fireball"].indexOf(type) >= 0) return true;
        return ["inFire", "onFire", "lava", "hotFloor", "fireball", "unattributedFireball", "campfire"].indexOf(String(data && data.cause || "")) >= 0;
    }

    /** 找被撒粉者身上的 mark，并请求它单次引爆；成功一次后 mark 结束，后续回执找不到同一份粉。 */
    function powderIgnite(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        const views = world.effects(actor, powderMark);
        if (!views.length) return false;
        return world.operation(views[0].id(), "world_combat:powder/ignite", "{}");
    }

    // 机读 mark 属于撒粉者：保存爆炸比例、画面数值与载体锚点，不自己结算。
    WorldCombat.effect(powderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["blast", "motes", "radius"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid powder mark: " + key);
        });
        if (typeof value.caster !== "string" || !value.caster.length) throw new Error("Invalid powder mark: caster");
        if (!value.carrier || !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid powder mark: carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powderMark, "start", function () { });
    WorldCombat.effectHandler(powderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 引爆在 mark 自己的作用域里执行：world 的来源是撒粉者，反噬账本归它，而不是事件里的受粉者。
    WorldCombat.effectHandler(powderMark, "operation:world_combat:powder/ignite", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (state.spent === true) { effect.reject("spent"); return; }
        if (!world.valid(actor) || !state.carrier || !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return; }
        state.spent = true; effect.state(JSON.stringify(state));
        // 单次锁定：先摘掉粉载体，之后任何回执都找不到同一份粉；脚本 commit 与原生回执不会双爆。
        const dust = MobEffects.read(world, actor, powderDust);
        if (dust !== null) world.removeMobEffect(actor, powderDust, dust.key());
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const at = body.position();
        const blast = Math.max(0, Math.min(0.5, Number(state.blast) || 0.2));
        const amount = Math.max(1, body.maxHealth() * blast);
        const motes = Math.max(12, Math.round(Number(state.motes) || 18));
        const scale = Math.max(0.6, Math.min(1.8, (Number(state.radius) || 0.26) / 0.26));
        // 原生 hurt 许可：免疫、护盾或无敌挡下时实际为 0，不重试、不补伤，按实际记入账本。
        const actual = Math.max(0, -world.health(actor, -amount, "world_combat:powder"));
        const ratio = body.maxHealth() > 0 ? actual / body.maxHealth() : 0;
        // 无破坏的视觉爆炸：只走表现与声音，不 world.explode、不推动无关物、不动地形。
        WorldFeedback.emit(world, powderScene, 1, at,
            { moment: "blast", target: String(actor.ref()), motes: motes, scale: scale,
              fireBurst: Math.max(2, Math.round(3 + ratio * 24)),
              intensity: Math.max(0.7, Math.min(2, 0.7 + ratio * 4)) }, 34);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), powderBlastText, [Math.round(actual * 10) / 10], 32);
        world.sound("minecraft:entity.generic.explode", at, 18, "{}");
        world.sound("cobblemon:impact.fire", at, 14, "{}");
        effect.end();
    });

    // 脚本火招：该对手提交火属性招式的当下引爆（火招照常放完）。
    WorldCombat.on("world_combat:move_powder/committed", "world_combat:committed", "", function (event) {
        const action = event.action(), world = event.world(), actor = event.actor();
        if (action === null || !world.valid(actor)) return;
        if (!world.effects(actor, powderMark).length) return;
        const move = NativeLoadout.executing(action);
        if (move === null || String(move.type()) !== "fire") return;
        powderIgnite(world, actor);
    });

    // 原生／模组火攻：被撒粉者自己真正造成第一笔对外火伤时引爆；环境火烧与别人打来的火不算它的火招。
    WorldCombat.on("world_combat:move_powder/native", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), target = event.target();
        if (target === null || !world.valid(actor)) return;
        const data: CombatNativeDamageFacts = JSON.parse(String(event.data()));
        if (!(typeof data.actual === "number" && data.actual > 0) || data.scripted) return;
        if (!data.sourceActor || String(actor.ref()) !== data.sourceActor) return;
        if (String(actor.key()) === String(target.key())) return;
        if (!world.effects(actor, powderMark).length) return;
        if (!powderFire(data)) return;
        powderIgnite(world, actor);
    });

    define({
        id: "powder",
        cooldownParameter: "recharge",
        name: "Powder",
        description: "朝瞄准方向抛出一团极细的粉尘，第一碰到的对手会被沾上：此后它自己放出火攻的那一刻，粉尘当场炸开一次，"
            + "对它造成一段按施法者特攻定级的自伤；火攻照常放完，粉尘随即消失，草属性直接穿过。",
        uses: ["在对手依赖火招时先埋一颗", "用它逼对手收起火属性招式", "给火属性主力一次「出手就挨炸」的代价"],
        kind: "aim",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 34,
        style: "dust",
        defaults: { volatile: false, ai: { maxChase: 10, leaveStation: true } },
        fields: [flag("volatile", "易爆")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powder"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("powder", "tempo", context)),
                recover: Math.round(p("powder", "aftercast", context)),
                cooldown: Math.round(p("powder", "recharge", context)),
                active: 1,
                range: p("powder", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powder:gather", powderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", intensity: config && config.volatile === true ? 1.2 : 1 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["powder"], detail: { values: config } };
            return { radius: p("powder", "radius", context), geometry: "circle", style: "dust", color: 0xE8D9A0,
                label: config && config.volatile === true ? "粉尘·易爆" : "粉尘" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const speed = Math.max(0.6, p("powder", "puffSpeed", action));
            const radius = Math.max(0.2, p("powder", "radius", action));
            const ticks = Math.max(140, Math.round(p("powder", "dustTicks", action)));
            const motes = Math.max(10, Math.round(p("powder", "motes", action)));
            const blast = Math.max(0.1, Math.min(0.5, p("powder", "blast", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.26));
            const actorRef = String(self.ref());
            const origin = action.origin(), aim = action.targetPosition();
            const delta = aim.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            const range = Math.max(1.5, distance < 0.01 ? action.range() : Math.min(action.range(), distance));
            const lifetime = Math.max(40, Math.ceil(range / speed) + 20);
            let settled = false;

            function miss(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, powderScene, 1, point, { moment: "puff", motes: motes, scale: scale }, 20);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), powderMissText, [], 24);
                sound(current, "cobblemon:move.powder.target");
                done(current);
            }

            function dusted(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const attach = primary !== null && scope.valid(primary) && !scope.friendly(primary)
                    && !powderGrassImmune(scope, primary) && !CombatStatus.has(scope, primary, "powdered");
                if (attach) {
                    // 走正常粉类状态许可：实际应用成功才建 mark。
                    const landed = CombatStatus.apply(scope, primary!, "powdered", powderDust, ticks, 0);
                    const carrier = landed ? MobEffects.read(scope, primary!, powderDust) : null;
                    if (carrier !== null) {
                        const views = scope.effects(primary!, powderMark);
                        for (let i = 0; i < views.length; i++) scope.operation(views[i].id(), "world_combat:dispel", "{}");
                        scope.effect(powderMark, primary!, JSON.stringify({ blast: blast, motes: motes, radius: radius,
                            caster: actorRef, carrier: MobEffects.anchor(carrier) }), ticks);
                        const body = scope.observe(primary!);
                        const at = body === null ? point : body.position();
                        WorldFeedback.emit(scope, powderScene, 1, at,
                            { moment: "dust", target: String(primary!.ref()), motes: motes, scale: scale }, 28);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), powderDustText, [Math.round(ticks / 20)], 30);
                        sound(current, "cobblemon:move.powder.target");
                        done(current);
                        return;
                    }
                }
                miss(current, point);
            }

            sound(action, "cobblemon:move.powder.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: lifetime, direction: direction,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.8, tint: 0xE8D9A0 },
                impact: function (current, hit) { dusted(current, hit.position(), hit.target()); }
            }, function (current) { dusted(current, current.targetPosition(), null); });
            WorldFeedback.emit(world, powderScene, 1, origin,
                { moment: "throw", projectile: flight, motes: motes, scale: scale }, 28);
        }
    });
}
