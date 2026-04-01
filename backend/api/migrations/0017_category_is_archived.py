from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_alter_category_options_category_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='В архиве'),
        ),
    ]
