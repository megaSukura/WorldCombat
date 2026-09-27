/**
 * 等离子浴的场与离子膜，对所有战斗者一致。
 *
 * iondeluge 是一条区域规则：场每 5 刻扫描半径内的人，给他们补 `world_combat:ion_film`（共享身份 ionized）。
 * 膜只带身份，兑现点在两处：
 *   1) 脚本招式：`PokemonDamage.metadata` 在结算前把一般属性改成电，再进入属性相性、电吸收特性与原生能力。
 *   2) 原生攻击：共享 `NativeAttackTypes` 已把已知近战/箭/三叉戟分类为 normal；本招的转换把带膜来源的
 *      这类攻击改成电，共享层保留原生 damageType/来源/护甲与一次原生 hurt，未知模组攻击保持未知。
 * 两条路都对所有来源生效（自己人、对手、别的模组生物、普通 MC 生物）。走出去后膜在 filmTicks 内自然脱落。
 * 场的边界表现由场效果本身拥有、并随它存续；膜表现由一个真实托管载体跟住实际 MobEffect 的剩余时间，
 * 到期或被驱散即随之结束，不留失效锚或残留发射。它不结算伤害。
 */
namespace PokemonSkills {
    function ionFieldPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function ionFilmTicks(field: WorldEffects.Field): number {
        return Math.max(6, Math.round(Number(field.data.film) || 12));
    }

    // 兑现点一：脚本招式。带膜者出一般属性招式，结算前改成电。
    // 原生 PokemonView 把 move.type 规范化为小写 showdown id，所以按 "normal" 比较、写 "electric"；
    // 未标明属性的一般原生攻击不会走到这里。
    PokemonDamage.metadata.define({ id: "world_combat:move_iondeluge/convert", apply: function (context) {
        if (!context.world || !context.actor) return;
        if (String(context.metadata.type).toLowerCase() !== "normal") return;
        if (!CombatStatus.has(context.world, context.actor, "ionized")) return;
        context.metadata.type = "electric";
        (<any>context.metadata).ionizedConverted = true;
    } });

    // 兑现点二：原生攻击。共享层已把已知普通原生攻击的 type 预置为 normal；
    // 带膜的实际来源把这一击改成电，之后由共享层套用新属性的本系/相性与原生结算。
    NativeAttackTypes.conversions.define({ id: "world_combat:move_iondeluge/native", apply: function (context) {
        if (!context.world) return;
        if (String(context.type).toLowerCase() !== "normal") return;
        if (!CombatStatus.has(context.world, context.source, "ionized")) return;
        context.type = "electric";
    } });

    // 真实转电的一次攻击在接触点给短电化回执；与入场的青色 snap 区分。原生拒绝（actual 为 0）时不发。
    WorldCombat.on("world_combat:move_iondeluge/converted", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const electric = String(data.type || "").toLowerCase() === "electric";
        const converted = data.ionizedConverted === true || electric && String(data.nativeBaseType || "") === "normal";
        const target = event.target();
        if (!converted || !electric || target === null) return;
        const world = event.world(), body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, ionDelugeScene, 1, body.position(), { moment: "convert", target: String(target.ref()) }, 16);
    });

    // 膜的托管表现载体：盯住目标身上实际 MobEffect 的剩余时间，膜消失就结束。
    WorldCombat.effect(ionFilmVisual, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ionFilmVisual, "start", function (effect) { effect.schedule("watch", "watch", 1, "{}"); });
    WorldCombat.effectHandler(ionFilmVisual, "watch", function (effect) {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        const film = body === null ? null : MobEffects.read(world, actor, ionFilm);
        if (body === null || film === null) { effect.end(); return; }
        effect.remaining(film.duration() < 0 ? 1200 : Math.max(1, Math.min(1200, film.duration())));
        WorldFeedback.onEffect(world, effect.id(), "film", ionDelugeScene, 1, body.position(), { moment: "film", target: String(actor.ref()) });
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(ionFilmVisual, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function ionCoat(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const current = MobEffects.read(world, actor, ionFilm);
        if (current !== null && current.duration() > 8) return true;
        return MobEffects.apply(world, actor, ionFilm, ionFilmTicks(field) + 4, 0) !== null;
    }
    function ionCarry(world: CombatWorld, actor: CombatActor): void {
        if (world.effects(actor, ionFilmVisual).length) return;
        world.effect(ionFilmVisual, actor, "{}", 40);
    }

    WorldEffects.fieldRule(ionField, {
        enter: function (world, actor, field) {
            // 膜没成功挂上就不亮膜、不发入场提示。
            if (!ionCoat(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, ionDelugeScene, 1, body.position(), { moment: "ionize", target: String(actor.ref()) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), ionizeText, [], 20);
            ionCarry(world, actor);
        },
        stay: function (world, actor, field) {
            ionCoat(world, actor, field);
            if (world.observe(actor) === null) return;
            if (MobEffects.read(world, actor, ionFilm) !== null) ionCarry(world, actor);
        },
        scan: function (effect, world, field) {
            // 边界表现由场效果自己拥有：自然到期或提前驱散都会随之清理。
            WorldFeedback.onEffect(world, effect.id(), "field", ionDelugeScene, 1, ionFieldPoint(field),
                { moment: "field", density: field.data.density || 28, scale: field.radius / 3.0 });
        }
    });

    // 离开浴场后膜自然脱落：一小圈电花从身上剥离。
    WorldCombat.on("world_combat:move_iondeluge/shed", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ionFilm || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, ionDelugeScene, 1, body.position(), { moment: "shed", target: String(actor.ref()) }, 18);
    });
}
