using System;
using System.Collections.Generic;
using System.Text;

namespace PageGenerator
{
    public class TestPage
    {
        const string _basePath = @"C:\Dev\pagemenu\background\testfiles\";

        public static void LongPageNoForm()
        {
            int i;
            var sb = new StringBuilder();

            sb.AddPageStart();
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

            sb.AddPageEnd();
            sb.WriteToFile(_basePath + "test1.html");
        }

        public static void LongFormOneLevel()
        {
            int i;
            var sb = new StringBuilder();

            sb.AddPageStart();
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

            sb.AddPageEnd();
            sb.WriteToFile(_basePath + "longform1.html");
        }
    }
}
