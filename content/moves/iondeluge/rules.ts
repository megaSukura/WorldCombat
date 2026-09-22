/**
 * 等离子浴的场与离子膜，对所有战斗者一致。
 *
 * iondeluge 是一条区域规则：场每 5 刻扫描半径内的人，给他们补 `world_combat:ion_film`（共享身份 ionized）；
 * 膜只带身份，行为在这里写——出一般属性招式时，`PokemonDamage.metadata` 在结算前把有效属性改成电。
 * 这条规则对所有来源的招式生效（自己人、对手、别的模组生物），改完再进入属性相性与电吸收特性的原生结算，
 * 所以「普通招变电招」带来的收益与反制都按世界已有规则走。走出浴场后膜在 filmTicks 内自然脱落。
 */
namespace PokemonSkills {
    function ionFieldPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    // 离子膜的兑现点：带膜者出一般属性招式，结算前改成电。
    PokemonDamage.metadata.define({ id: "world_combat:move_iondeluge/convert", apply: function (context) {
        if (!context.world || !context.actor) return;
        if (context.metadata.type !== "Normal") return;
        if (!CombatStatus.has(context.world, context.actor, "ionized")) return;
        context.metadata.type = "Electric";
    } });

    WorldEffects.fieldRule(ionField, {
        enter: function (world, actor, field) {
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, ionDelugeScene, 1, body.position(), { moment: "ionize", target: String(actor.ref()) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), ionizeText, [], 20);
        },
        stay: function (world, actor, field) {
            const film = Math.max(6, Math.round(Number(field.data.film) || 12));
            const current = MobEffects.read(world, actor, ionFilm);
            if (current === null || current.duration() - world.tick() <= 8) MobEffects.apply(world, actor, ionFilm, film + 4, 0);
        },
        scan: function (effect, world, field) {
            WorldFeedback.keep(world, "world_combat:move_iondeluge/field/" + effect.id(), ionDelugeScene, 1, ionFieldPoint(field),
                { moment: "field", density: field.data.density || 28, scale: field.radius / 3.0 }, 20);
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
