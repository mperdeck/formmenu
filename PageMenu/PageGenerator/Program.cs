using System;
using System.Text;

namespace PageGenerator
{
    // Writes test page to current directory


    /// <summary>
    /// Writes test page to file.
    /// File path (relative to current dir) is given in first argument.
    /// </summary>
    class Program
    {
        static void Main(string[] args)
        {
            int i;
            string filePath = args[0];
            if (string.IsNullOrEmpty(filePath))
            {
                Console.WriteLine("No file path given.");
            }

            var sb = new StringBuilder();
            sb.AddPageStart();
            sb.AddHeading(1);

            sb.AddLoremIpsum(1);

            for(i = 0; i < 3; i++)
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
            sb.WriteToFile(filePath);
        }
    }
}
