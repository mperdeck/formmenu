using System;
using System.Collections.Generic;
using System.Text;

namespace PageGenerator
{
    public class TestPage
    {
        public static void LongPageNoForm(StringBuilder sb)
        {
            int i;
            sb.AddHeading(1);

            sb.AddLoremIpsum(1);

            for (i = 0; i < 3; i++)
            {
                sb.AddHeading(2);
                sb.AddLoremIpsum(4);
            }

            sb.AddHeading(2);

            for (int i2 = 0; i2 < 3; i2++)
            {
                sb.AddHeading(3);
                sb.AddLoremIpsum(1);
                for (int j = 0; j < 4; j++)
                {
                    sb.AddHeading(4);
                    sb.AddLoremIpsum(1);

                    sb.AddHeading(5);
                    sb.AddLoremIpsum(1);

                    sb.AddHeading(6);
                    sb.AddLoremIpsum(2);

                    sb.AddHeading(6);
                    sb.AddLoremIpsum(2);
                }
            }

            sb.AddHeading(2);
            sb.AddLoremIpsum(4);
        }

        public static void LongFormOneLevel(StringBuilder sb)
        {
            int i;
            sb.AddHeading(1);

            sb.AddLoremIpsum(1);

            for (i = 0; i < 10; i++)
            {
                sb.AddHeading(2);

                sb.AddInput(true, false);

                sb.AddInput(false, false);
                sb.AddInput(false, false);

                sb.AddInput(true, true);
                sb.AddInput(false, false);
                sb.AddInput(false, false);

                sb.AddInput(false, true);
                sb.AddInput(false, false);
                sb.AddInput(false, false);
            }
        }

        public static void ShortFormOneLevel(StringBuilder sb)
        {
            int i;
            sb.AddHeading(1);

            sb.AddLoremIpsum(1);

            sb.AddHeading(2);

            sb.AddOneOfEach();

            for (i = 0; i < 1; i++)
            {
                sb.AddHeading(2);

                sb.AddInput(true, false);

                sb.AddInput(false, false);
                sb.AddInput(false, false);

                sb.AddInput(true, true);
                sb.AddInput(false, false);

                sb.AddInput(false, true);
                sb.AddInput(false, false);
            }
        }
    }
}
